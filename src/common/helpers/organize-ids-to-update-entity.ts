export const organizeIDsToUpdateEntity = (
  newIDs: string[],
  oldIDs: string[],
) => {
  let toUpdate: string[] = [];
  let toCreate: string[] = [];
  let toDelete: string[] = [];

  newIDs.forEach((newID) => {
    if (oldIDs.includes(newID)) {
      toUpdate.push(newID);
    } else {
      toCreate.push(newID);
    }
  });

  oldIDs.forEach((oldID) => {
    if (!newIDs.includes(oldID)) {
      toDelete.push(oldID);
    }
  });

  return {
    toCreate,
    toUpdate,
    toDelete,
  };
};
