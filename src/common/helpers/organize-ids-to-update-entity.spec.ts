import { organizeIDsToUpdateEntity } from './organize-ids-to-update-entity';

describe('organizeIDsToUpdateEntity', () => {
  it('should return correct toCreate, toUpdate, and toDelete arrays when newIDs and oldIDs have common elements', () => {
    const newIDs = ['1', '2', '3'];
    const oldIDs = ['2', '3', '4'];
    const result = organizeIDsToUpdateEntity(newIDs, oldIDs);
    expect(result).toEqual({
      toCreate: ['1'],
      toUpdate: ['2', '3'],
      toDelete: ['4'],
    });
  });

  it('should return all newIDs in toCreate and all oldIDs in toDelete when there are no common elements', () => {
    const newIDs = ['1', '2', '3'];
    const oldIDs = ['4', '5', '6'];
    const result = organizeIDsToUpdateEntity(newIDs, oldIDs);
    expect(result).toEqual({
      toCreate: ['1', '2', '3'],
      toUpdate: [],
      toDelete: ['4', '5', '6'],
    });
  });

  it('should return all newIDs in toCreate when oldIDs is empty', () => {
    const newIDs = ['1', '2', '3'];
    const oldIDs: string[] = [];
    const result = organizeIDsToUpdateEntity(newIDs, oldIDs);
    expect(result).toEqual({
      toCreate: ['1', '2', '3'],
      toUpdate: [],
      toDelete: [],
    });
  });

  it('should return all oldIDs in toDelete when newIDs is empty', () => {
    const newIDs: string[] = [];
    const oldIDs = ['1', '2', '3'];
    const result = organizeIDsToUpdateEntity(newIDs, oldIDs);
    expect(result).toEqual({
      toCreate: [],
      toUpdate: [],
      toDelete: ['1', '2', '3'],
    });
  });

  it('should return empty arrays for toCreate, toUpdate, and toDelete when both newIDs and oldIDs are empty', () => {
    const newIDs: string[] = [];
    const oldIDs: string[] = [];
    const result = organizeIDsToUpdateEntity(newIDs, oldIDs);
    expect(result).toEqual({
      toCreate: [],
      toUpdate: [],
      toDelete: [],
    });
  });
});
