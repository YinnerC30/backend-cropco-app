import { Logger } from '@nestjs/common';

export interface BulkRemovalResult {
  success: string[];
  failed: { id: string; error: string }[];
}

export interface BulkRemovalOptions {
  parallel?: boolean;
  entityName?: string;
}

/**
 * Helper class for bulk removal operations
 * Supports both parallel and sequential execution patterns
 */
export class BulkRemovalHelper {
  /**
   * Executes bulk removal of records
   * @param recordsIds Array of record IDs to remove
   * @param removeFunction Function that removes a single record by ID
   * @param logger Logger instance for logging operations
   * @param options Configuration options for the bulk operation
   * @returns Promise<BulkRemovalResult> Object containing successful and failed removals
   */
  static async executeBulkRemoval<T>(
    recordsIds: { id: string }[],
    removeFunction: (id: string) => Promise<void>,
    logger: Logger,
    options: BulkRemovalOptions = {},
  ): Promise<BulkRemovalResult> {
    const { parallel = true, entityName = 'records' } = options;
    
    logger.log(
      `Starting bulk removal of ${recordsIds.length} ${entityName}`,
    );

    try {
      if (parallel) {
        return await this.executeParallelRemoval(
          recordsIds,
          removeFunction,
          logger,
          entityName,
        );
      } else {
        return await this.executeSequentialRemoval(
          recordsIds,
          removeFunction,
          logger,
          entityName,
        );
      }
    } catch (error) {
      logger.error(`Failed to execute bulk removal of ${entityName}`, error);
      throw error;
    }
  }

  /**
   * Executes bulk removal in parallel using Promise.allSettled
   */
  private static async executeParallelRemoval<T>(
    recordsIds: { id: string }[],
    removeFunction: (id: string) => Promise<void>,
    logger: Logger,
    entityName: string,
  ): Promise<BulkRemovalResult> {
    const results = await Promise.allSettled(
      recordsIds.map(({ id }) => removeFunction(id)),
    );

    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    results.forEach((result, i) => {
      const { id } = recordsIds[i];
      if (result.status === 'fulfilled') {
        success.push(id);
      } else {
        failed.push({ 
          id, 
          error: result.reason?.message || 'Unknown error' 
        });
      }
    });

    logger.log(
      `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
    );

    return { success, failed };
  }

  /**
   * Executes bulk removal sequentially using for...of loop
   */
  private static async executeSequentialRemoval<T>(
    recordsIds: { id: string }[],
    removeFunction: (id: string) => Promise<void>,
    logger: Logger,
    entityName: string,
  ): Promise<BulkRemovalResult> {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const { id } of recordsIds) {
      try {
        await removeFunction(id);
        success.push(id);
      } catch (error) {
        failed.push({ id, error: error.message });
      }
    }

    logger.log(
      `Bulk removal completed. Success: ${success.length}, Failed: ${failed.length}`,
    );

    return { success, failed };
  }
} 