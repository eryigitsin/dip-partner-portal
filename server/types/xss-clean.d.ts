declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  
  interface XSSOptions {
    body?: boolean;
    loggerFunction?: (err: string) => void;
  }
  
  function xssClean(options?: XSSOptions): RequestHandler;
  
  export = xssClean;
}