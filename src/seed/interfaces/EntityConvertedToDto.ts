export type EntityConvertedToDto<T> = Partial<T> & {
  id: string;
};
