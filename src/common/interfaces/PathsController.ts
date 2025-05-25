export interface PathProperties {
  path: string;
  description: string;
  name?: string;
  visibleToUser?: boolean;
}

export interface PathsController {
  [key: string]: PathProperties;
}
