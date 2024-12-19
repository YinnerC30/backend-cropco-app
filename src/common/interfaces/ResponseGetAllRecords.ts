export interface ResponseGetAllRecords<T> {
  rowCount: number;
  rows: T[];
  pageCount: number;
}
