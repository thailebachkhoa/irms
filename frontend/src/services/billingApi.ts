// frontend/src/services/billingApi.ts
import { api } from './api';
import type { Bill } from '../types';
import type { AxiosResponse } from 'axios';

export const billingApi = {
  getBillByTable: (tableId: string) =>
    api.get<Bill>(`/billing/${tableId}`)
      .then((r: AxiosResponse<Bill>) => r.data),

  pay: (billId: string) =>
    api.post<Bill>(`/billing/${billId}/pay`)
      .then((r: AxiosResponse<Bill>) => r.data),
};