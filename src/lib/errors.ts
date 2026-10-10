export class AppError extends Error{constructor(public status:number,message:string){super(message);this.name='AppError';}}
export function fail(status:number,message:string):never{throw new AppError(status,message);}
