const key = 'qvc-hub-v2';
const empty = { favorites: [], history: [], explored: [] };
export function readProfile() {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (
      !data ||
      !Array.isArray(data.favorites) ||
      !Array.isArray(data.history) ||
      !Array.isArray(data.explored)
    )
      return structuredClone(empty);
    return {
      favorites: data.favorites.filter((v) => typeof v === 'string').slice(0, 100),
      explored: data.explored.filter((v) => typeof v === 'string').slice(0, 100),
      history: data.history
        .filter(
          (v) =>
            v &&
            typeof v.id === 'string' &&
            typeof v.title === 'string' &&
            typeof v.date === 'string' &&
            Number.isFinite(Date.parse(v.date))
        )
        .slice(0, 200),
    };
  } catch {
    return structuredClone(empty);
  }
}
export function saveProfile(profile) {
  try {
    localStorage.setItem(key, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function recordVisit(tool) {
  const profile = readProfile();
  if (!profile.explored.includes(tool.id)) profile.explored.push(tool.id);
  profile.history.unshift({ id: tool.id, title: tool.name, date: new Date().toISOString() });
  profile.history = profile.history.slice(0, 200);
  saveProfile(profile);
}
