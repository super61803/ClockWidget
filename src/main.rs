#![windows_subsystem = "windows"]

mod timezone;

use std::f32::consts::TAU;
use std::ffi::c_void;
use std::mem::{size_of, zeroed};
use std::ptr::{null, null_mut};

use windows_sys::Win32::Foundation::*;
use windows_sys::Win32::Graphics::Gdi::*;
use windows_sys::Win32::System::LibraryLoader::{GetModuleFileNameW, GetModuleHandleW};
use windows_sys::Win32::System::Registry::*;
use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
use windows_sys::Win32::System::Time::DYNAMIC_TIME_ZONE_INFORMATION;
use windows_sys::Win32::System::Threading::{CreateMutexW, GetSystemTimes};
use windows_sys::Win32::UI::Accessibility::{HWINEVENTHOOK, SetWinEventHook, UnhookWinEvent};
use windows_sys::Win32::UI::HiDpi::*;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
use windows_sys::Win32::UI::Shell::*;
use windows_sys::Win32::UI::WindowsAndMessaging::*;

const BASE_SIZE: i32 = 192;
/// Stroke widths are specified in pixels at this dial size.
const DESIGN_SIZE: f32 = 160.0;
const MIN_ALPHA: u8 = 32;
const ALPHA_STEP: u8 = 16;

const WM_TRAY: u32 = WM_APP + 1;
const TIMER_ID: usize = 1;
/// One-shot: first CPU reading needs a short baseline interval.
const FIRST_STATS_TIMER: usize = 2;
const STATS_TIMER: usize = 3;

const HK_MORE: i32 = 1;
const HK_LESS: i32 = 2;
const HK_CLICK: i32 = 3;

const ID_CLICK: usize = 100;
const ID_SECONDS: usize = 101;
const ID_AUTOSTART: usize = 102;
const ID_EXIT: usize = 103;
const ID_STATS: usize = 104;
const ID_OPACITY: usize = 200;
const OPACITY_STEPS: [u8; 6] = [255, 217, 178, 140, 102, 64];
const ID_INTERVAL: usize = 300;
const STATS_INTERVALS: [u32; 7] = [1, 2, 5, 10, 30, 60, 300];
const DEFAULT_STATS_SECS: u32 = 60;

const ID_TIMEZONE: usize = 400;

const DAY_MS: u64 = 86_400_000;

const REG_PATH: &str = "Software\\ClockWidget";
const RUN_PATH: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const RUN_NAME: &str = "ClockWidget";

type Rgba = [f32; 4];

#[derive(Clone, Copy)]
struct Ink {
    fg: Rgba,
    /// Contrasting color; its alpha is the crisp 1px outline strength.
    edge: Rgba,
    /// Alpha of the soft wide glow (edge color) around every stroke.
    glow: f32,
    /// Alpha of the faint radial tint (edge color) behind the whole dial.
    backdrop: f32,
}

/// Always white; the dark outline and glow keep it readable on light backgrounds.
const INK: Ink = Ink { fg: [0.96, 0.96, 0.96, 1.0], edge: [0.0, 0.0, 0.0, 0.60], glow: 0.35, backdrop: 0.0 };
const ICON_INK: Ink = Ink { fg: [0.96, 0.96, 0.96, 1.0], edge: [0.10, 0.10, 0.11, 0.0], glow: 0.0, backdrop: 1.0 };

impl Ink {
    fn with_alpha(&self, a: f32) -> Rgba {
        [self.edge[0], self.edge[1], self.edge[2], a]
    }

    /// Glow + outline beneath a stroke of half-width `w` at distance `d`.
    fn underlay(&self, p: &mut Rgba, w: f32, d: f32, glow_w: f32) {
        let t = ((w + glow_w - d) / glow_w).clamp(0.0, 1.0);
        blend(p, self.with_alpha(self.glow), t * t);
        blend(p, self.edge, cov(w + 1.0 - d));
    }
}

struct App {
    hwnd: HWND,
    size: i32,
    alpha: u8,
    click_through: bool,
    /// Ctrl held: click-through suspended so the clock can be dragged.
    peek: bool,
    hook: HHOOK,
    /// Foreground-change hook used to stay above other topmost windows.
    fg_hook: HWINEVENTHOOK,
    /// The context menu is open; raising the clock would cover it.
    menu_open: bool,
    move_cursor: HCURSOR,
    seconds: bool,
    stats: bool,
    stats_secs: u32,
    cpu_prev: (u64, u64),
    label: String,
    text: Vec<u8>,
    tz_index: usize,
    tz: Option<DYNAMIC_TIME_ZONE_INFORMATION>,
    offset_minute: u64,
    face: Vec<u32>,
    dc: HDC,
    bmp: HBITMAP,
    bits: *mut u32,
    icon: HICON,
    taskbar_created: u32,
}

static mut APP: *mut App = null_mut();

fn app() -> &'static mut App {
    unsafe { &mut *APP }
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}

// ---------------------------------------------------------------- raster

fn cov(inside: f32) -> f32 {
    (inside + 0.5).clamp(0.0, 1.0)
}

fn blend(p: &mut Rgba, c: Rgba, k: f32) {
    let a = c[3] * k;
    for i in 0..3 {
        p[i] = c[i] * a + p[i] * (1.0 - a);
    }
    p[3] = a + p[3] * (1.0 - a);
}

fn seg_dist(px: f32, py: f32, ax: f32, ay: f32, bx: f32, by: f32) -> f32 {
    let (bax, bay, pax, pay) = (bx - ax, by - ay, px - ax, py - ay);
    let t = ((pax * bax + pay * bay) / (bax * bax + bay * bay)).clamp(0.0, 1.0);
    let (dx, dy) = (pax - bax * t, pay - bay * t);
    (dx * dx + dy * dy).sqrt()
}

fn pack(p: Rgba) -> u32 {
    let q = |v: f32| (v.clamp(0.0, 1.0) * 255.0 + 0.5) as u32;
    q(p[2]) | q(p[1]) << 8 | q(p[0]) << 16 | q(p[3]) << 24
}

fn unpack(v: u32) -> Rgba {
    let f = |s: u32| ((v >> s) & 0xff) as f32 / 255.0;
    [f(16), f(8), f(0), f(24)]
}

/// Pixel scale relative to `DESIGN_SIZE`; strokes never go below `min`.
fn px_width(sf: f32, w: f32, min: f32) -> f32 {
    (w * sf / DESIGN_SIZE).max(min)
}

/// Static dial (12 thin ticks plus optional text coverage mask), stored as premultiplied BGRA.
fn build_face(s: usize, ink: Ink, text: &[u8]) -> Vec<u32> {
    let text_at = |x: usize, y: usize| text.get(y * s + x).map_or(0.0, |&v| v as f32 / 255.0);
    let sf = s as f32;
    let c = sf / 2.0;
    let r = c - 1.0;
    let glow_w = px_width(sf, 3.0, 2.0);
    let glow_r = glow_w.ceil() as isize;
    let mut out = Vec::with_capacity(s * s);
    for y in 0..s {
        for x in 0..s {
            let (px, py) = (x as f32 + 0.5 - c, y as f32 + 0.5 - c);
            let dc = (px * px + py * py).sqrt();
            let mut p = [0.0; 4];
            // Non-zero alpha everywhere inside keeps the whole dial grabbable.
            let tint = (ink.backdrop * (1.0 - (dc / r).powi(6))).max(1.0 / 255.0);
            blend(&mut p, ink.with_alpha(tint), cov(r - dc));

            let a = (px.atan2(-py) / (TAU / 12.0)).round() * TAU / 12.0;
            let (dx, dy) = (a.sin() * r, -a.cos() * r);
            let w = px_width(sf, 1.0, 0.7);
            let d = seg_dist(px, py, dx * 0.85, dy * 0.85, dx * 0.96, dy * 0.96);
            ink.underlay(&mut p, w, d, glow_w);
            blend(&mut p, ink.fg, cov(w - d));

            if !text.is_empty() {
                let (mut glow, mut edge) = (0.0f32, 0.0f32);
                for oy in -glow_r..=glow_r {
                    for ox in -glow_r..=glow_r {
                        let (nx, ny) = (x as isize + ox, y as isize + oy);
                        if nx < 0 || ny < 0 || nx >= s as isize || ny >= s as isize {
                            continue;
                        }
                        let m = text_at(nx as usize, ny as usize);
                        let dist = ((ox * ox + oy * oy) as f32).sqrt();
                        let t = (1.0 - dist / (glow_w + 1.0)).max(0.0);
                        glow = glow.max(m * t * t);
                        if ox.abs() <= 1 && oy.abs() <= 1 {
                            edge = edge.max(m);
                        }
                    }
                }
                blend(&mut p, ink.with_alpha(ink.glow), glow);
                blend(&mut p, ink.edge, edge);
                blend(&mut p, ink.fg, text_at(x, y));
            }
            out.push(pack(p));
        }
    }
    out
}

/// Renders centered lines in the lower half of the dial as a grayscale coverage mask.
unsafe fn text_mask(s: i32, label: &str) -> Vec<u8> {
    if label.is_empty() {
        return Vec::new();
    }
    unsafe {
        let (bmp, bits) = create_dib(s);
        if bmp.is_null() {
            return Vec::new();
        }
        let dc = CreateCompatibleDC(null_mut());
        let old_bmp = SelectObject(dc, bmp);
        let face = wide("Segoe UI");
        let font = CreateFontW(
            -(s * 6 / 100).max(8),
            0,
            0,
            0,
            FW_NORMAL as i32,
            0,
            0,
            0,
            DEFAULT_CHARSET as u32,
            OUT_DEFAULT_PRECIS as u32,
            CLIP_DEFAULT_PRECIS as u32,
            ANTIALIASED_QUALITY as u32,
            DEFAULT_PITCH as u32,
            face.as_ptr(),
        );
        let old_font = SelectObject(dc, font);
        SetTextColor(dc, 0x00FF_FFFF);
        SetBkMode(dc, TRANSPARENT as i32);
        let mut text: Vec<u16> = label.encode_utf16().collect();
        let mut rc = RECT { left: 0, top: s / 2 + s * 15 / 100, right: s, bottom: s };
        DrawTextW(dc, text.as_mut_ptr(), text.len() as i32, &mut rc, DT_CENTER | DT_NOPREFIX);
        GdiFlush();
        let mask = std::slice::from_raw_parts(bits, (s * s) as usize).iter().map(|&v| (v >> 8) as u8).collect();
        SelectObject(dc, old_font);
        SelectObject(dc, old_bmp);
        DeleteObject(font);
        DeleteObject(bmp);
        DeleteDC(dc);
        mask
    }
}

fn cpu_times() -> (u64, u64) {
    let f = |t: FILETIME| ((t.dwHighDateTime as u64) << 32) | t.dwLowDateTime as u64;
    unsafe {
        let (mut idle, mut kernel, mut user): (FILETIME, FILETIME, FILETIME) = (zeroed(), zeroed(), zeroed());
        GetSystemTimes(&mut idle, &mut kernel, &mut user);
        // Kernel time includes idle time.
        (f(idle), f(kernel) + f(user))
    }
}

fn ram_load() -> u32 {
    unsafe {
        let mut m: MEMORYSTATUSEX = zeroed();
        m.dwLength = size_of::<MEMORYSTATUSEX>() as u32;
        GlobalMemoryStatusEx(&mut m);
        m.dwMemoryLoad
    }
}

struct Hand {
    ax: f32,
    ay: f32,
    bx: f32,
    by: f32,
    w: f32,
}

fn hands(sf: f32, ms: u64, seconds: bool) -> Vec<Hand> {
    let r = sf / 2.0 - 1.0;
    let mk = |frac: f64, tail: f32, len: f32, w: f32| {
        let a = (frac * std::f64::consts::TAU) as f32;
        let (dx, dy) = (a.sin() * r, -a.cos() * r);
        Hand { ax: -dx * tail, ay: -dy * tail, bx: dx * len, by: dy * len, w: px_width(sf, w, 0.6) }
    };
    let mut v = vec![
        mk((ms % 43_200_000) as f64 / 43_200_000.0, 0.0, 0.62, 1.65),
        mk((ms % 3_600_000) as f64 / 3_600_000.0, 0.0, 0.86, 1.1),
    ];
    if seconds {
        v.push(mk((ms / 1000 % 60) as f64 / 60.0, 0.14, 0.88, 0.75));
    }
    v
}

/// Composites the hands over `face` into `out` (premultiplied BGRA).
fn paint(out: &mut [u32], face: &[u32], s: usize, ms: u64, seconds: bool, ink: Ink) {
    let sf = s as f32;
    let c = sf / 2.0;
    let hs = hands(sf, ms, seconds);
    let dot = px_width(sf, 3.2, 1.2);
    let glow_w = px_width(sf, 3.0, 2.0);
    for y in 0..s {
        for x in 0..s {
            let i = y * s + x;
            let (px, py) = (x as f32 + 0.5 - c, y as f32 + 0.5 - c);
            let dc = (px * px + py * py).sqrt();
            let mut ds = [0.0f32; 3];
            for (d, h) in ds.iter_mut().zip(&hs) {
                *d = seg_dist(px, py, h.ax, h.ay, h.bx, h.by);
            }
            let mut p = unpack(face[i]);
            let (mut glow, mut edge) = (0.0f32, 0.0f32);
            for (w, d) in hs.iter().map(|h| h.w).zip(ds).chain(Some((dot, dc))) {
                let t = ((w + glow_w - d) / glow_w).clamp(0.0, 1.0);
                glow = glow.max(t * t);
                edge = edge.max(cov(w + 1.0 - d));
            }
            blend(&mut p, ink.with_alpha(ink.glow), glow);
            blend(&mut p, ink.edge, edge);
            for (h, d) in hs.iter().zip(&ds) {
                blend(&mut p, ink.fg, cov(h.w - d));
            }
            blend(&mut p, ink.fg, cov(dot - dc));
            out[i] = pack(p);
        }
    }
}

unsafe fn create_dib(s: i32) -> (HBITMAP, *mut u32) {
    unsafe {
        let mut bi: BITMAPINFO = zeroed();
        bi.bmiHeader.biSize = size_of::<BITMAPINFOHEADER>() as u32;
        bi.bmiHeader.biWidth = s;
        bi.bmiHeader.biHeight = -s;
        bi.bmiHeader.biPlanes = 1;
        bi.bmiHeader.biBitCount = 32;
        bi.bmiHeader.biCompression = BI_RGB;
        let mut bits = null_mut();
        let bmp = CreateDIBSection(null_mut(), &bi, DIB_RGB_COLORS, &mut bits, null_mut(), 0);
        (bmp, bits as *mut u32)
    }
}

unsafe fn make_icon() -> HICON {
    unsafe {
        let s = GetSystemMetrics(SM_CXSMICON).max(16);
        let (bmp, bits) = create_dib(s);
        if bmp.is_null() {
            return LoadIconW(null_mut(), IDI_APPLICATION);
        }
        let n = (s * s) as usize;
        let face = build_face(s as usize, ICON_INK, &[]);
        let out = std::slice::from_raw_parts_mut(bits, n);
        paint(out, &face, s as usize, (10 * 60 + 8) * 60_000, false, ICON_INK);
        let mask_bits = vec![0u8; (s as usize).div_ceil(16) * 2 * s as usize];
        let mask = CreateBitmap(s, s, 1, 1, mask_bits.as_ptr() as *const c_void);
        let ii = ICONINFO { fIcon: 1, xHotspot: 0, yHotspot: 0, hbmMask: mask, hbmColor: bmp };
        let icon = CreateIconIndirect(&ii);
        DeleteObject(mask);
        DeleteObject(bmp);
        icon
    }
}

// ---------------------------------------------------------------- registry

fn reg_get(name: &str) -> Option<u32> {
    let (k, n) = (wide(REG_PATH), wide(name));
    let (mut v, mut sz) = (0u32, 4u32);
    let r = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            k.as_ptr(),
            n.as_ptr(),
            RRF_RT_REG_DWORD,
            null_mut(),
            &mut v as *mut u32 as *mut c_void,
            &mut sz,
        )
    };
    (r == ERROR_SUCCESS).then_some(v)
}

fn reg_set(name: &str, v: u32) {
    let (k, n) = (wide(REG_PATH), wide(name));
    unsafe {
        RegSetKeyValueW(HKEY_CURRENT_USER, k.as_ptr(), n.as_ptr(), REG_DWORD, &v as *const u32 as *const c_void, 4);
    }
}

fn autostart_enabled() -> bool {
    let (k, n) = (wide(RUN_PATH), wide(RUN_NAME));
    let mut sz = 0u32;
    unsafe {
        RegGetValueW(HKEY_CURRENT_USER, k.as_ptr(), n.as_ptr(), RRF_RT_REG_SZ, null_mut(), null_mut(), &mut sz)
            == ERROR_SUCCESS
    }
}

fn set_autostart(on: bool) {
    let (k, n) = (wide(RUN_PATH), wide(RUN_NAME));
    unsafe {
        if on {
            let mut buf = [0u16; 1024];
            let len = GetModuleFileNameW(null_mut(), buf.as_mut_ptr(), buf.len() as u32) as usize;
            let path = String::from_utf16_lossy(&buf[..len]);
            let cmd = wide(&format!("\"{path}\""));
            RegSetKeyValueW(
                HKEY_CURRENT_USER,
                k.as_ptr(),
                n.as_ptr(),
                REG_SZ,
                cmd.as_ptr() as *const c_void,
                (cmd.len() * 2) as u32,
            );
        } else {
            RegDeleteKeyValueW(HKEY_CURRENT_USER, k.as_ptr(), n.as_ptr());
        }
    }
}

// ---------------------------------------------------------------- app

impl App {
    fn resize(&mut self, s: i32) {
        if s == self.size && !self.bmp.is_null() {
            return;
        }
        unsafe {
            let (bmp, bits) = create_dib(s);
            if bmp.is_null() {
                return;
            }
            SelectObject(self.dc, bmp);
            if !self.bmp.is_null() {
                DeleteObject(self.bmp);
            }
            self.bmp = bmp;
            self.bits = bits;
        }
        self.size = s;
        self.text = unsafe { text_mask(s, &self.label) };
        self.rebuild_faces();
    }

    /// CPU is averaged over the interval since the previous call.
    fn update_stats(&mut self) {
        let (idle, total) = cpu_times();
        let (d_idle, d_total) = (idle - self.cpu_prev.0, total - self.cpu_prev.1);
        self.cpu_prev = (idle, total);
        self.label = if self.stats && d_total > 0 {
            let cpu = (d_total - d_idle.min(d_total)) as f64 * 100.0 / d_total as f64;
            format!("CPU {:.0}%\nRAM {}%", cpu, ram_load())
        } else {
            String::new()
        };
        self.text = unsafe { text_mask(self.size, &self.label) };
        self.rebuild_faces();
    }

    fn rebuild_faces(&mut self) {
        self.face = build_face(self.size as usize, INK, &self.text);
    }

    fn set_stats(&mut self, on: bool) {
        self.stats = on;
        self.update_stats();
        self.render();
        self.start_stats_timer();
        self.save();
    }

    fn set_stats_interval(&mut self, secs: u32) {
        self.stats_secs = secs;
        self.start_stats_timer();
        self.save();
    }

    fn start_stats_timer(&self) {
        unsafe {
            if self.stats {
                SetTimer(self.hwnd, STATS_TIMER, self.stats_secs * 1000, None);
            } else {
                KillTimer(self.hwnd, STATS_TIMER);
            }
        }
    }

    fn render(&mut self) -> u64 {
        let ms = timezone::now_ms() % DAY_MS;
        if self.bits.is_null() {
            return ms;
        }
        let s = self.size as usize;
        let out = unsafe { std::slice::from_raw_parts_mut(self.bits, s * s) };
        paint(out, &self.face, s, ms, self.seconds, INK);
        unsafe {
            GdiFlush();
            let size = SIZE { cx: self.size, cy: self.size };
            let src = POINT { x: 0, y: 0 };
            let blend = BLENDFUNCTION {
                BlendOp: AC_SRC_OVER as u8,
                BlendFlags: 0,
                SourceConstantAlpha: self.alpha,
                AlphaFormat: AC_SRC_ALPHA as u8,
            };
            UpdateLayeredWindow(self.hwnd, null_mut(), null(), &size, self.dc, &src, 0, &blend, ULW_ALPHA);
        }
        ms
    }

    fn tick(&mut self) {
        let minute = timezone::utc_minute();
        if minute != self.offset_minute {
            self.offset_minute = minute;
            self.refresh_offset();
        }
        self.raise();
        let ms = self.render();
        let period = if self.seconds { 1000 } else { 60_000 };
        let delay = (period - ms % period + 15) as u32;
        unsafe { SetTimer(self.hwnd, TIMER_ID, delay, None) };
    }

    /// Moves the clock to the top of the topmost band without activating it.
    fn raise(&self) {
        if self.menu_open {
            return;
        }
        unsafe {
            SetWindowPos(
                self.hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
            );
        }
    }

    fn set_alpha(&mut self, a: u8) {
        self.alpha = a.max(MIN_ALPHA);
        self.render();
        self.save();
    }

    fn set_click_through(&mut self, on: bool) {
        self.click_through = on;
        unsafe {
            if on && self.hook.is_null() {
                self.hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(kb_hook), GetModuleHandleW(null()), 0);
            } else if !on && !self.hook.is_null() {
                UnhookWindowsHookEx(self.hook);
                self.hook = null_mut();
            }
        }
        self.peek = false;
        self.apply_transparency();
        self.save();
    }

    fn apply_transparency(&self) {
        let on = self.click_through && !self.peek;
        unsafe {
            let ex = GetWindowLongW(self.hwnd, GWL_EXSTYLE) as u32;
            let ex = if on { ex | WS_EX_TRANSPARENT } else { ex & !WS_EX_TRANSPARENT };
            SetWindowLongW(self.hwnd, GWL_EXSTYLE, ex as i32);
        }
    }

    fn set_seconds(&mut self, on: bool) {
        self.seconds = on;
        self.tick();
        self.save();
    }

    /// Re-reads the zone's UTC offset; runs once a minute so DST changes are picked up.
    fn refresh_offset(&mut self) {
        if let Some(ms) = self.tz.as_ref().and_then(timezone::offset_of) {
            if ms != timezone::offset() {
                timezone::set_offset(ms);
                self.tray(NIM_MODIFY);
            }
        }
    }

    fn set_timezone(&mut self, index: usize) {
        self.tz_index = index;
        self.tz = timezone::resolve(index);
        self.refresh_offset();
        self.tray(NIM_MODIFY);
        self.tick();
        self.save();
    }

    fn save(&self) {
        let mut r: RECT = unsafe { zeroed() };
        if unsafe { GetWindowRect(self.hwnd, &mut r) } != 0 {
            reg_set("X", r.left as u32);
            reg_set("Y", r.top as u32);
        }
        reg_set("Alpha", self.alpha as u32);
        reg_set("ClickThrough", self.click_through as u32);
        reg_set("Seconds", self.seconds as u32);
        reg_set("Stats", self.stats as u32);
        reg_set("StatsInterval", self.stats_secs);
        reg_set("TimeZone", self.tz_index as u32);
    }

    fn tray(&self, msg: NOTIFY_ICON_MESSAGE) {
        unsafe {
            let mut nid: NOTIFYICONDATAW = zeroed();
            nid.cbSize = size_of::<NOTIFYICONDATAW>() as u32;
            nid.hWnd = self.hwnd;
            nid.uID = 1;
            nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
            nid.uCallbackMessage = WM_TRAY;
            nid.hIcon = self.icon;
            let (name, _) = timezone::ZONES[self.tz_index];
            let tip = format!("Clock \u{2014} {name} ({})", timezone::format_offset(timezone::offset()));
            for (d, s) in nid.szTip.iter_mut().take(127).zip(tip.encode_utf16()) {
                *d = s;
            }
            Shell_NotifyIconW(msg, &nid);
        }
    }
}

/// Shows the context menu and returns the chosen command id (0 if none).
fn show_menu(hwnd: HWND) -> usize {
    let (alpha, click_through, seconds, stats, stats_secs) = {
        let a = app();
        (a.alpha, a.click_through, a.seconds, a.stats, a.stats_secs)
    };
    let tz_index = app().tz_index;
    let zone_labels: Vec<String> = timezone::resolve_all()
        .iter()
        .zip(timezone::ZONES)
        .map(|(d, (name, _))| match d.as_ref().and_then(timezone::offset_of) {
            Some(ms) => format!("{name}\t{}", timezone::format_offset(ms)),
            None => format!("{name}\t(unavailable)"),
        })
        .collect();
    let chk = |b: bool| if b { MF_CHECKED } else { MF_UNCHECKED };
    unsafe {
        let m = CreatePopupMenu();
        let tz_menu = CreatePopupMenu();
        for (i, label) in zone_labels.iter().enumerate() {
            AppendMenuW(tz_menu, MF_STRING | chk(i == tz_index), ID_TIMEZONE + i, wide(label).as_ptr());
            if i == 2 {
                AppendMenuW(tz_menu, MF_SEPARATOR, 0, null());
            }
        }
        let tz_title = format!("Time zone: {}", timezone::ZONES[tz_index].0);
        AppendMenuW(m, MF_POPUP, tz_menu as usize, wide(&tz_title).as_ptr());
        let sub = CreatePopupMenu();
        for (i, &op) in OPACITY_STEPS.iter().enumerate() {
            let label = wide(&format!("{}%", (op as u32 * 100 + 127) / 255));
            AppendMenuW(sub, MF_STRING | chk(alpha == op), ID_OPACITY + i, label.as_ptr());
        }
        AppendMenuW(m, MF_POPUP, sub as usize, wide("Opacity\tCtrl+Alt+\u{2191}/\u{2193}").as_ptr());
        AppendMenuW(
            m,
            MF_STRING | chk(click_through),
            ID_CLICK,
            wide("Click-through (hold Ctrl to drag)\tCtrl+Alt+K").as_ptr(),
        );
        AppendMenuW(m, MF_STRING | chk(seconds), ID_SECONDS, wide("Second hand").as_ptr());
        AppendMenuW(m, MF_STRING | chk(stats), ID_STATS, wide("CPU / RAM").as_ptr());
        let interval = CreatePopupMenu();
        for (i, &secs) in STATS_INTERVALS.iter().enumerate() {
            let label = if secs < 60 { format!("{secs} sec") } else { format!("{} min", secs / 60) };
            AppendMenuW(interval, MF_STRING | chk(stats_secs == secs), ID_INTERVAL + i, wide(&label).as_ptr());
        }
        let grayed = if stats { 0 } else { MF_GRAYED };
        AppendMenuW(m, MF_POPUP | grayed, interval as usize, wide("CPU / RAM update interval").as_ptr());
        AppendMenuW(m, MF_STRING | chk(autostart_enabled()), ID_AUTOSTART, wide("Start with Windows").as_ptr());
        AppendMenuW(m, MF_SEPARATOR, 0, null());
        AppendMenuW(m, MF_STRING, ID_EXIT, wide("Exit").as_ptr());

        let mut pt: POINT = zeroed();
        GetCursorPos(&mut pt);
        SetForegroundWindow(hwnd);
        app().menu_open = true;
        let cmd = TrackPopupMenu(m, TPM_RETURNCMD | TPM_NONOTIFY | TPM_RIGHTBUTTON, pt.x, pt.y, 0, hwnd, null());
        app().menu_open = false;
        PostMessageW(hwnd, WM_NULL, 0, 0);
        DestroyMenu(m);
        cmd as usize
    }
}

fn run_command(hwnd: HWND, cmd: usize) {
    match cmd {
        ID_CLICK => app().set_click_through(!app().click_through),
        ID_SECONDS => app().set_seconds(!app().seconds),
        ID_STATS => app().set_stats(!app().stats),
        c if (ID_INTERVAL..ID_INTERVAL + STATS_INTERVALS.len()).contains(&c) => {
            app().set_stats_interval(STATS_INTERVALS[c - ID_INTERVAL])
        }
        c if (ID_TIMEZONE..ID_TIMEZONE + timezone::ZONES.len()).contains(&c) => app().set_timezone(c - ID_TIMEZONE),
        ID_AUTOSTART => set_autostart(!autostart_enabled()),
        ID_EXIT => unsafe {
            PostMessageW(hwnd, WM_CLOSE, 0, 0);
        },
        c if (ID_OPACITY..ID_OPACITY + OPACITY_STEPS.len()).contains(&c) => {
            app().set_alpha(OPACITY_STEPS[c - ID_OPACITY])
        }
        _ => {}
    }
}

unsafe extern "system" fn kb_hook(code: i32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    unsafe {
        if code == HC_ACTION as i32 && !APP.is_null() {
            let vk = (*(lp as *const KBDLLHOOKSTRUCT)).vkCode;
            if vk == VK_LCONTROL as u32 || vk == VK_RCONTROL as u32 {
                let down = wp == WM_KEYDOWN as usize || wp == WM_SYSKEYDOWN as usize;
                let a = app();
                if down != a.peek {
                    a.peek = down;
                    a.apply_transparency();
                }
            }
        }
        CallNextHookEx(null_mut(), code, wp, lp)
    }
}

/// Another window became active (it may be topmost too): go back on top of it.
unsafe extern "system" fn on_foreground(_: HWINEVENTHOOK, _: u32, hwnd: HWND, _: i32, _: i32, _: u32, _: u32) {
    unsafe {
        if !APP.is_null() && hwnd != app().hwnd {
            app().raise();
        }
    }
}

unsafe extern "system" fn wndproc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    unsafe {
        if APP.is_null() {
            return DefWindowProcW(hwnd, msg, wp, lp);
        }
        match msg {
            WM_TIMER if wp == FIRST_STATS_TIMER => {
                KillTimer(hwnd, FIRST_STATS_TIMER);
                app().update_stats();
                app().render();
                app().start_stats_timer();
            }
            WM_TIMER if wp == STATS_TIMER => {
                app().update_stats();
                app().render();
            }
            WM_TIMER => app().tick(),
            WM_HOTKEY => match wp as i32 {
                HK_MORE => app().set_alpha(app().alpha.saturating_add(ALPHA_STEP)),
                HK_LESS => app().set_alpha(app().alpha.saturating_sub(ALPHA_STEP)),
                HK_CLICK => app().set_click_through(!app().click_through),
                _ => {}
            },
            WM_WINDOWPOSCHANGING => {
                // Nothing may push the clock out of the topmost band.
                let pos = &mut *(lp as *mut WINDOWPOS);
                if pos.flags & SWP_NOZORDER == 0 {
                    pos.hwndInsertAfter = HWND_TOPMOST;
                }
                return DefWindowProcW(hwnd, msg, wp, lp);
            }
            WM_DISPLAYCHANGE | WM_SETTINGCHANGE => app().raise(),
            WM_NCHITTEST => return HTCAPTION as LRESULT,
            WM_SETCURSOR => {
                SetCursor(app().move_cursor);
                return 1;
            }
            WM_NCRBUTTONUP => run_command(hwnd, show_menu(hwnd)),
            WM_MOUSEWHEEL => {
                let delta = ((wp >> 16) & 0xffff) as u16 as i16;
                let a = app().alpha;
                app().set_alpha(if delta > 0 { a.saturating_add(ALPHA_STEP) } else { a.saturating_sub(ALPHA_STEP) });
            }
            WM_EXITSIZEMOVE => {
                app().save();
            }
            WM_ENDSESSION => app().save(),
            WM_TRAY => {
                let m = (lp & 0xffff) as u32;
                if m == WM_RBUTTONUP || m == WM_LBUTTONUP {
                    run_command(hwnd, show_menu(hwnd));
                }
            }
            WM_DPICHANGED => {
                let s = BASE_SIZE * (wp & 0xffff) as i32 / 96;
                let r = &*(lp as *const RECT);
                app().resize(s);
                SetWindowPos(hwnd, null_mut(), r.left, r.top, s, s, SWP_NOZORDER | SWP_NOACTIVATE);
                app().render();
            }
            WM_DESTROY => {
                if !app().hook.is_null() {
                    UnhookWindowsHookEx(app().hook);
                }
                if !app().fg_hook.is_null() {
                    UnhookWinEvent(app().fg_hook);
                }
                app().save();
                app().tray(NIM_DELETE);
                PostQuitMessage(0);
            }
            m if m == app().taskbar_created => {
                app().tray(NIM_ADD);
                app().raise();
            }
            _ => return DefWindowProcW(hwnd, msg, wp, lp),
        }
        0
    }
}

fn initial_pos(size: i32) -> (i32, i32) {
    if let (Some(x), Some(y)) = (reg_get("X"), reg_get("Y")) {
        let (x, y) = (x as i32, y as i32);
        let center = POINT { x: x + size / 2, y: y + size / 2 };
        if !unsafe { MonitorFromPoint(center, MONITOR_DEFAULTTONULL) }.is_null() {
            return (x, y);
        }
    }
    let mut wa: RECT = unsafe { zeroed() };
    unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut wa as *mut RECT as *mut c_void, 0) };
    (wa.right - size - 24, wa.top + 24)
}

fn main() {
    unsafe {
        let mutex_name = wide("Local\\ClockWidget.SingleInstance");
        CreateMutexW(null(), 0, mutex_name.as_ptr());
        if GetLastError() == ERROR_ALREADY_EXISTS {
            return;
        }
        SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

        let hinst = GetModuleHandleW(null());
        let class = wide("ClockWidget");
        let wc = WNDCLASSEXW {
            cbSize: size_of::<WNDCLASSEXW>() as u32,
            lpfnWndProc: Some(wndproc),
            hInstance: hinst,
            hCursor: LoadCursorW(null_mut(), IDC_ARROW),
            lpszClassName: class.as_ptr(),
            ..zeroed()
        };
        RegisterClassExW(&wc);

        let alpha = reg_get("Alpha").map_or(230, |v| v.clamp(MIN_ALPHA as u32, 255) as u8);
        let click_through = reg_get("ClickThrough").is_none_or(|v| v != 0);
        let seconds = reg_get("Seconds").is_none_or(|v| v != 0);
        let stats = reg_get("Stats").is_none_or(|v| v != 0);
        let stats_secs = reg_get("StatsInterval")
            .filter(|v| STATS_INTERVALS.contains(v))
            .unwrap_or(DEFAULT_STATS_SECS);
        let tz_index = reg_get("TimeZone").map_or(0, |v| v as usize).min(timezone::ZONES.len() - 1);
        let tz = timezone::resolve(tz_index);
        if let Some(ms) = tz.as_ref().and_then(timezone::offset_of) {
            timezone::set_offset(ms);
        }

        let mut ex = WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE;
        if click_through {
            ex |= WS_EX_TRANSPARENT;
        }
        let title = wide("Clock");
        let hwnd = CreateWindowExW(
            ex,
            class.as_ptr(),
            title.as_ptr(),
            WS_POPUP,
            0,
            0,
            BASE_SIZE,
            BASE_SIZE,
            null_mut(),
            null_mut(),
            hinst,
            null(),
        );
        if hwnd.is_null() {
            return;
        }
        // Hidden from screenshots, screen sharing and recording (Win10 2004+).
        if SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE) == 0 {
            SetWindowDisplayAffinity(hwnd, WDA_MONITOR);
        }

        APP = Box::into_raw(Box::new(App {
            hwnd,
            size: 0,
            alpha,
            click_through,
            peek: false,
            hook: null_mut(),
            menu_open: false,
            fg_hook: SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                null_mut(),
                Some(on_foreground),
                0,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            ),
            move_cursor: LoadCursorW(null_mut(), IDC_SIZEALL),
            seconds,
            stats,
            stats_secs,
            cpu_prev: cpu_times(),
            label: String::new(),
            text: Vec::new(),
            tz_index,
            tz,
            offset_minute: timezone::utc_minute(),
            face: Vec::new(),
            dc: CreateCompatibleDC(null_mut()),
            bmp: null_mut(),
            bits: null_mut(),
            icon: make_icon(),
            taskbar_created: RegisterWindowMessageW(wide("TaskbarCreated").as_ptr()),
        }));

        let guess = BASE_SIZE * GetDpiForWindow(hwnd) as i32 / 96;
        let (x, y) = initial_pos(guess);
        SetWindowPos(hwnd, HWND_TOPMOST, x, y, guess, guess, SWP_NOACTIVATE);
        let size = BASE_SIZE * GetDpiForWindow(hwnd) as i32 / 96;
        app().resize(size);
        SetWindowPos(hwnd, null_mut(), 0, 0, size, size, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);

        app().set_click_through(click_through);
        app().tray(NIM_ADD);
        RegisterHotKey(hwnd, HK_MORE, MOD_CONTROL | MOD_ALT, VK_UP as u32);
        RegisterHotKey(hwnd, HK_LESS, MOD_CONTROL | MOD_ALT, VK_DOWN as u32);
        RegisterHotKey(hwnd, HK_CLICK, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 'K' as u32);

        app().tick();
        ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        SetTimer(hwnd, FIRST_STATS_TIMER, 1000, None);
        let mut msg: MSG = zeroed();
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}
