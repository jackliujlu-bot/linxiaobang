export type Id=string;
export type Actor={id:Id;role:'USER'|'ADMIN'};
export type OrderStatus='OPEN'|'CLAIMED'|'DELIVERED'|'COMPLETED'|'CANCELLED'|'EXPIRED';
export type SimStatus='HELD'|'SETTLED'|'REFUNDED';
export type Category='MEAL'|'TRASH';
export interface OrderView{
 id:Id;category:Category;pickupArea:string;dropoffArea:string;deadlineAt:string;bountyCents:200|300;
 status:OrderStatus;simStatus:SimStatus;requesterId:Id;assigneeId:Id|null;disputeOpen:boolean;privateDetails?:string;
}
export interface CreateOrderInput{category:Category;pickupArea:string;dropoffArea:string;deadlineAt:string;bountyCents:200|300;privateDetails:string}
