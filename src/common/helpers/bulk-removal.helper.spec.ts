import { Logger } from '@nestjs/common';
import { BulkRemovalHelper, BulkRemovalResult } from './bulk-removal.helper';

describe('BulkRemovalHelper', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockRemoveFunction: jest.MockedFunction<(id: string) => Promise<void>>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    mockRemoveFunction = jest.fn();
  });

  describe('executeBulkRemoval', () => {
    const recordsIds = [
      { id: 'uuid-1' },
      { id: 'uuid-2' },
      { id: 'uuid-3' },
    ];

    it('should execute parallel removal by default', async () => {
      mockRemoveFunction.mockResolvedValue(undefined);

      const result = await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
      );

      expect(mockRemoveFunction).toHaveBeenCalledTimes(3);
      expect(mockRemoveFunction).toHaveBeenCalledWith('uuid-1');
      expect(mockRemoveFunction).toHaveBeenCalledWith('uuid-2');
      expect(mockRemoveFunction).toHaveBeenCalledWith('uuid-3');
      expect(result.success).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
      expect(result.failed).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting bulk removal of 3 records',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk removal completed. Success: 3, Failed: 0',
      );
    });

    it('should execute sequential removal when parallel is false', async () => {
      mockRemoveFunction.mockResolvedValue(undefined);

      const result = await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
        { parallel: false },
      );

      expect(mockRemoveFunction).toHaveBeenCalledTimes(3);
      expect(result.success).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
      expect(result.failed).toEqual([]);
    });

    it('should handle partial failures in parallel mode', async () => {
      mockRemoveFunction
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Record not found'))
        .mockResolvedValueOnce(undefined);

      const result = await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
      );

      expect(result.success).toEqual(['uuid-1', 'uuid-3']);
      expect(result.failed).toEqual([
        { id: 'uuid-2', error: 'Record not found' },
      ]);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk removal completed. Success: 2, Failed: 1',
      );
    });

    it('should handle partial failures in sequential mode', async () => {
      mockRemoveFunction
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Record not found'))
        .mockResolvedValueOnce(undefined);

      const result = await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
        { parallel: false },
      );

      expect(result.success).toEqual(['uuid-1', 'uuid-3']);
      expect(result.failed).toEqual([
        { id: 'uuid-2', error: 'Record not found' },
      ]);
    });

    it('should use custom entity name in logs', async () => {
      mockRemoveFunction.mockResolvedValue(undefined);

      await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
        { entityName: 'users' },
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting bulk removal of 3 users',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk removal completed. Success: 3, Failed: 0',
      );
    });

    it('should handle unknown errors in parallel mode', async () => {
      mockRemoveFunction
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce('Unknown error')
        .mockResolvedValueOnce(undefined);

      const result = await BulkRemovalHelper.executeBulkRemoval(
        recordsIds,
        mockRemoveFunction,
        mockLogger,
      );

      expect(result.failed).toEqual([
        { id: 'uuid-2', error: 'Unknown error' },
      ]);
    });

    // it('should throw error when bulk operation fails completely', async () => {
    //   const error = new Error('Database connection failed');
    //   mockRemoveFunction.mockRejectedValue(error);

    //   await expect(
    //     BulkRemovalHelper.executeBulkRemoval(
    //       recordsIds,
    //       mockRemoveFunction,
    //       mockLogger,
    //     ),
    //   ).rejects.toThrow('Database connection failed');

    //   expect(mockLogger.error).toHaveBeenCalledWith(
    //     'Failed to execute bulk removal of records',
    //     error,
    //   );
    // });
  });
}); 