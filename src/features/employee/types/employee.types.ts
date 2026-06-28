import { RequestContext } from "../../auth/types/auth.types";

export interface CreateEmployeeContext extends RequestContext {
  AdminId: string;
}