export const getAbbreviation = (name: string) => {
  if (!name) return "S";

  const nameParts = name.trim().split(" ");
  let abbreviation = "";

  if (nameParts.length > 0) {
    abbreviation += nameParts[0][0];
  }

  if (nameParts.length > 1) {
    abbreviation += nameParts[1][0];
  }

  return abbreviation.toUpperCase();
};

export const sortProjectsFunc = (a: any, b: any) => {
  if (a.project_name.toLowerCase() > b.project_name.toLowerCase()) {
    return 1;
  } else if (a.project_name.toLowerCase() < b.project_name.toLowerCase()) {
    return -1;
  } else {
    return 0;
  }
};
