// frontend/src/services/kitchenApi.ts

import { api } from './api';
import type { KitchenTicket } from '../types';
import type { AxiosResponse } from 'axios';

export const kitchenApi = {
  getActiveTickets: () =>
    api.get<KitchenTicket[]>('/kitchen/tickets')
      .then((r: AxiosResponse<KitchenTicket[]>) => r.data),

  startCooking: (id: string) =>
    api.patch<KitchenTicket>(`/kitchen/${id}/start`)
      .then((r: AxiosResponse<KitchenTicket>) => r.data),

  markDone: (id: string) =>
    api.patch<KitchenTicket>(`/kitchen/${id}/done`)
      .then((r: AxiosResponse<KitchenTicket>) => r.data),
};