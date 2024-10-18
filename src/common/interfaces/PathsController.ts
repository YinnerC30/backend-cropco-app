export interface PathsController {
  [key: string]: {
    path: string;
    description: string;
    name?: string;
  };
}
