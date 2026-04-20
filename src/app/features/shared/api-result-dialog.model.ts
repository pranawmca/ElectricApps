export type ApiResultType = 'success' | 'error';

export interface ApiResultDialogData {
  title: string;
  message: string;
  type: ApiResultType; 
  success: boolean;
}
