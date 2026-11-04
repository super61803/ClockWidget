//! Time zone selection, backed by the Windows time zone database (DST-aware).

use std::mem::zeroed;
use std::sync::atomic::{AtomicI64, Ordering};

use windows_sys::Win32::Foundation::{FILETIME, SYSTEMTIME};
use windows_sys::Win32::System::SystemInformation::{GetSystemTime, GetSystemTimeAsFileTime};
use windows_sys::Win32::System::Time::{
    DYNAMIC_TIME_ZONE_INFORMATION, EnumDynamicTimeZoneInformation, GetDynamicTimeZoneInformation,
    SystemTimeToFileTime, SystemTimeToTzSpecificLocalTimeEx,
};

/// Menu label and Windows time zone key. An empty key means the system's local zone.
pub const ZONES: [(&str, &str); 17] = [
    ("Vladivostok", "Vladivostok Standard Time"),
    ("Local time (system)", ""),
    ("UTC", "UTC"),
    ("Tokyo", "Tokyo Standard Time"),
    ("Seoul", "Korea Standard Time"),
    ("Beijing / Shanghai", "China Standard Time"),
    ("Singapore", "Singapore Standard Time"),
    ("India", "India Standard Time"),
    ("Dubai", "Arabian Standard Time"),
    ("Moscow", "Russian Standard Time"),
    ("Berlin / Paris", "W. Europe Standard Time"),
    ("London", "GMT Standard Time"),
    ("New York", "Eastern Standard Time"),
    ("Chicago", "Central Standard Time"),
    ("Denver", "Mountain Standard Time"),
    ("Los Angeles", "Pacific Standard Time"),
    ("Sydney", "AUS Eastern Standard Time"),
];

/// Vladivostok (UTC+10, no DST) until a zone is resolved.
static OFFSET_MS: AtomicI64 = AtomicI64::new(10 * 3_600_000);

fn utc_ms() -> u64 {
    const FILETIME_TO_UNIX_MS: u64 = 11_644_473_600_000;
    let mut ft: FILETIME = unsafe { zeroed() };
    unsafe { GetSystemTimeAsFileTime(&mut ft) };
    (((ft.dwHighDateTime as u64) << 32) | ft.dwLowDateTime as u64) / 10_000 - FILETIME_TO_UNIX_MS
}

/// Wall-clock time of the selected zone, in ms since 1970-01-01 00:00 of that zone.
pub fn now_ms() -> u64 {
    (utc_ms() as i64 + OFFSET_MS.load(Ordering::Relaxed)) as u64
}

pub fn utc_minute() -> u64 {
    utc_ms() / 60_000
}

pub fn set_offset(ms: i64) {
    OFFSET_MS.store(ms, Ordering::Relaxed);
}

pub fn offset() -> i64 {
    OFFSET_MS.load(Ordering::Relaxed)
}

fn key_of(d: &DYNAMIC_TIME_ZONE_INFORMATION) -> String {
    let k = &d.TimeZoneKeyName;
    String::from_utf16_lossy(&k[..k.iter().position(|&c| c == 0).unwrap_or(k.len())])
}

/// Resolves every entry of `ZONES` in a single pass over the Windows zone list.
pub fn resolve_all() -> Vec<Option<DYNAMIC_TIME_ZONE_INFORMATION>> {
    let mut out = vec![None; ZONES.len()];
    unsafe {
        let mut local: DYNAMIC_TIME_ZONE_INFORMATION = zeroed();
        GetDynamicTimeZoneInformation(&mut local);
        for (slot, (_, key)) in out.iter_mut().zip(ZONES) {
            if key.is_empty() {
                *slot = Some(local);
            }
        }
        let mut i = 0;
        loop {
            let mut d: DYNAMIC_TIME_ZONE_INFORMATION = zeroed();
            if EnumDynamicTimeZoneInformation(i, &mut d) != 0 {
                break;
            }
            let key = key_of(&d);
            for (slot, (_, k)) in out.iter_mut().zip(ZONES) {
                if k == key {
                    *slot = Some(d);
                }
            }
            i += 1;
        }
    }
    out
}

pub fn resolve(index: usize) -> Option<DYNAMIC_TIME_ZONE_INFORMATION> {
    resolve_all().into_iter().nth(index).flatten()
}

/// Current UTC offset of a zone in ms, including daylight saving if in effect.
pub fn offset_of(d: &DYNAMIC_TIME_ZONE_INFORMATION) -> Option<i64> {
    unsafe {
        let mut utc: SYSTEMTIME = zeroed();
        GetSystemTime(&mut utc);
        utc.wMilliseconds = 0;
        let mut local: SYSTEMTIME = zeroed();
        if SystemTimeToTzSpecificLocalTimeEx(d, &utc, &mut local) == 0 {
            return None;
        }
        let ft = |st: &SYSTEMTIME| {
            let mut f: FILETIME = zeroed();
            SystemTimeToFileTime(st, &mut f);
            (((f.dwHighDateTime as u64) << 32) | f.dwLowDateTime as u64) as i64
        };
        Some((ft(&local) - ft(&utc)) / 10_000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_fixed_offset_zones() {
        let zones = resolve_all();
        let off = |name: &str| {
            let i = ZONES.iter().position(|(n, _)| *n == name).unwrap();
            zones[i].as_ref().and_then(offset_of).map(format_offset)
        };
        assert_eq!(off("Vladivostok").as_deref(), Some("UTC+10"));
        assert_eq!(off("UTC").as_deref(), Some("UTC+0"));
        assert_eq!(off("Tokyo").as_deref(), Some("UTC+9"));
        assert_eq!(off("India").as_deref(), Some("UTC+5:30"));
        assert!(zones.iter().all(Option::is_some), "every listed zone exists on this system");
    }
}

/// "UTC+10", "UTC-4", "UTC+5:30".
pub fn format_offset(ms: i64) -> String {
    let min = ms / 60_000;
    let (sign, min) = if min < 0 { ('-', -min) } else { ('+', min) };
    match min % 60 {
        0 => format!("UTC{sign}{}", min / 60),
        m => format!("UTC{sign}{}:{m:02}", min / 60),
    }
}
