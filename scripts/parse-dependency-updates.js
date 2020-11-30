// Usage: node parse_updates.js $(npm outdated --parseable)

const updateRegexPattern = '^.*:(.*)@(.*):.*@(.*):.*@(.*)$';

export const extractDependencyUpdatesFromList = listOfUpdates =>
  listOfUpdates.filter(item => isUpdate(item));

export const isUpdate = updateString => updateString.split(':').length > 1;

export const fromString = updateString => {
  const matcher = updateString.match(updateRegexPattern);

  return {
    package: matcher[1],
    wantedVersion: matcher[2],
    currentVersion: matcher[3],
    latestVersion: matcher[4]
  };
};

export const getAllUpdates = listOfUpdates =>
  extractDependencyUpdatesFromList(listOfUpdates).map(update => fromString(update));

export const getAllUpdatesText = listOfUpdates => {
  const allUpdates = getAllUpdates(listOfUpdates);
  return allUpdates.reduce(
    (acc, item) =>
      acc +
      `<b><a href=https://www.npmjs.com/package/${item.package}>${item.package}</a></b>: ${item.currentVersion} &rarr; ${item.latestVersion}<br>`,
    ''
  );
};

console.log(getAllUpdates(process.argv));
