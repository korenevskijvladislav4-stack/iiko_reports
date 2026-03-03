import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_ENV = import.meta.env.MODE === 'production' ? 'production' : 'development';
const API_BASE = `/api/v1/${API_ENV}`;

let currentToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentToken = token;
}

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in (response as any)) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export type AuthResult = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    companyName?: string;
    scheduleAccessRole?: string;
    includeInSchedule?: boolean;
  };
  company: {
    id: string;
    name: string;
  };
};

export type IikoCredentials = {
  serverUrl: string;
  login: string;
  password?: string;
};

export type HostFilters = {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  deliveryFilter?: string;
  selectedDepartments?: string[];
  selectedPayTypes?: string[];
  departmentOrder?: string[];
};

export type OlapPayload = {
  report: 'SALES' | 'TRANSACTIONS' | 'DELIVERIES' | 'STOCK' | 'BALANCE';
  from: string;
  to: string;
  groupByRowFields?: string[];
  groupByColFields?: string[];
  aggregateFields?: string[];
  filters?: Record<string, unknown>;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers) => {
      if (currentToken) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Settings', 'PayTypes', 'DeliveryFlags', 'ProductGroups', 'Points', 'Departments', 'Positions', 'Users', 'Schedules', 'ProductCost'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<AuthResult, { email: string; password: string }>({
      query: (body) => ({
        url: 'auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => unwrapData<AuthResult>(response),
    }),
    register: builder.mutation<
      AuthResult,
      { companyName: string; email: string; password: string; name: string }
    >({
      query: (body) => ({
        url: 'auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => unwrapData<AuthResult>(response),
    }),
    me: builder.query<
      {
        id: string;
        email: string;
        name: string;
        role: string;
        companyId: string;
        scheduleAccessRole: string;
        includeInSchedule: boolean;
        company: { id: string; name: string };
      },
      void
    >({
      query: () => 'me',
      transformResponse: (response: unknown) =>
        unwrapData<{
          id: string;
          email: string;
          name: string;
          role: string;
          companyId: string;
          scheduleAccessRole: string;
          includeInSchedule: boolean;
          company: { id: string; name: string };
        }>(response),
    }),

    // iiko credentials
    getIikoCredentials: builder.query<IikoCredentials | null, void>({
      query: () => 'iiko-credentials',
      transformResponse: (response: unknown) => {
        if (!response) return null;
        const data = unwrapData<{ serverUrl: string; login: string }>(response);
        if (!data) return null;
        return { serverUrl: data.serverUrl, login: data.login };
      },
    }),
    saveIikoCredentials: builder.mutation<void, IikoCredentials>({
      query: (body) => ({
        url: 'iiko-credentials',
        method: 'PUT',
        body,
      }),
    }),

    // Product cost report (BE)
    getProductCostReport: builder.mutation<
      { rows: { productGroup: string; product: string; quantitySold: number; costFromIiko: number; departmentSalary: number; humanCost: number; currentPriceFromIiko: number }[]; totalDepartmentSalary: number },
      { from: string; to: string }
    >({
      query: ({ from, to }) => ({
        url: `product-cost?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ rows?: unknown[]; totalDepartmentSalary?: number }>(response);
        return {
          rows: Array.isArray(data?.rows) ? data.rows as { productGroup: string; product: string; quantitySold: number; costFromIiko: number; departmentSalary: number; humanCost: number; currentPriceFromIiko: number }[] : [],
          totalDepartmentSalary: typeof data?.totalDepartmentSalary === 'number' ? data.totalDepartmentSalary : 0,
        };
      },
    }),

    // Store balance report (остатки по точкам/складам)
    getStoreBalanceReport: builder.mutation<
      {
        pointName: string;
        departmentId: string | null;
        storeId: string;
        productId: string;
        productName: string | null;
        productGroup: string | null;
        amount: number;
        sum: number;
        totalSold: number;
        salesByDay: { date: string; quantitySold: number }[];
      }[],
      { from?: string; to?: string } | void
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params && params.from) search.set('from', params.from);
        if (params && params.to) search.set('to', params.to);
        const qs = search.toString();
        return {
          url: `store-balance${qs ? `?${qs}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ rows?: unknown[] }>(response);
        return (Array.isArray(data?.rows) ? data.rows : []) as {
          pointName: string;
          departmentId: string | null;
          storeId: string;
          productId: string;
          productName: string | null;
          productGroup: string | null;
          amount: number;
          sum: number;
          totalSold: number;
          salesByDay: { date: string; quantitySold: number }[];
        }[];
      },
    }),

    // Products reference (справочник номенклатуры)
    getProducts: builder.query<{ productId: string; name: string }[], void>({
      query: () => 'products',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as { productId: string; name: string }[]) : [];
      },
      providesTags: ['Products'],
    }),
    syncProducts: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: 'products/sync',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ ok?: boolean }>(response);
        return { ok: data.ok ?? true };
      },
      invalidatesTags: ['Products'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (productId) => ({
        url: 'products',
        method: 'DELETE',
        body: { productId },
      }),
      invalidatesTags: ['Products'],
    }),

    // Reports / OLAP
    fetchOlapReport: builder.mutation<{ data?: unknown; raw?: string; isXml?: boolean }, OlapPayload>({
      query: (body) => ({
        url: 'reports/olap',
        method: 'POST',
        body,
        responseHandler: 'text',
      }),
      transformResponse: (raw: string) => {
        const isJson = raw.trim().startsWith('{') || raw.trim().startsWith('[');
        if (isJson) {
          try {
            const parsed = JSON.parse(raw);
            return { data: unwrapData<unknown>(parsed) };
          } catch {
            return { raw, isXml: false };
          }
        }
        const isXml = /^\s*</.test(raw);
        return { raw, isXml };
      },
    }),

    // Settings
    getSettings: builder.query<HostFilters, void>({
      query: () => 'settings',
      transformResponse: (response: unknown) => {
        const data = unwrapData<HostFilters | null>(response);
        return data && typeof data === 'object' ? data : {};
      },
      providesTags: ['Settings'],
    }),
    saveSettings: builder.mutation<void, HostFilters>({
      query: (filters) => ({
        url: 'settings',
        method: 'POST',
        body: { filters },
      }),
      invalidatesTags: ['Settings'],
    }),

    // Pay types & delivery flags
    getDeliveryFlagValues: builder.query<string[], void>({
      query: () => 'delivery-flags',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as string[]) : [];
      },
      providesTags: ['DeliveryFlags'],
    }),
    syncDeliveryFlagValues: builder.mutation<{ count: number; list: string[] }, void>({
      query: () => ({
        url: 'delivery-flags/sync',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ count?: number; list?: string[] }>(response);
        return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
      },
      invalidatesTags: ['DeliveryFlags'],
    }),
    deleteDeliveryFlagValue: builder.mutation<void, string>({
      query: (value) => ({
        url: 'delivery-flags',
        method: 'DELETE',
        body: { value },
      }),
      invalidatesTags: ['DeliveryFlags'],
    }),

    getProductGroupValues: builder.query<string[], void>({
      query: () => 'product-groups',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as string[]) : [];
      },
      providesTags: ['ProductGroups'],
    }),
    syncProductGroupValues: builder.mutation<{ count: number; list: string[] }, void>({
      query: () => ({
        url: 'product-groups/sync',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ count?: number; list?: string[] }>(response);
        return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
      },
      invalidatesTags: ['ProductGroups'],
    }),
    deleteProductGroupValue: builder.mutation<void, string>({
      query: (value) => ({
        url: 'product-groups',
        method: 'DELETE',
        body: { value },
      }),
      invalidatesTags: ['ProductGroups'],
    }),

    getPoints: builder.query<string[], void>({
      query: () => 'points',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as string[]) : [];
      },
      providesTags: ['Points'],
    }),
    syncPoints: builder.mutation<{ count: number; list: string[] }, void>({
      query: () => ({
        url: 'points/sync',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ count?: number; list?: string[] }>(response);
        return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
      },
      invalidatesTags: ['Points'],
    }),
    getPointDepartmentLinks: builder.query<
      { pointName: string; departmentId: string; departmentName?: string }[],
      void
    >({
      query: () => 'points/links',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as { pointName: string; departmentId: string; departmentName?: string }[]) : [];
      },
      providesTags: ['Points'],
    }),
    setPointDepartment: builder.mutation<
      { pointName: string; departmentId: string; departmentName?: string },
      { pointName: string; departmentId: string }
    >({
      query: (body) => ({
        url: 'points/links',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Points'],
    }),
    unsetPointDepartment: builder.mutation<void, string>({
      query: (pointName) => ({
        url: `points/links?pointName=${encodeURIComponent(pointName)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Points'],
    }),
    deletePoint: builder.mutation<void, string>({
      query: (pointName) => ({
        url: `points?pointName=${encodeURIComponent(pointName)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Points'],
    }),

    getPayTypes: builder.query<string[], void>({
      query: () => 'pay-types',
      transformResponse: (response: unknown) => {
        const data = unwrapData<unknown>(response);
        return Array.isArray(data) ? (data as string[]) : [];
      },
      providesTags: ['PayTypes'],
    }),
    syncPayTypes: builder.mutation<{ count: number; list: string[] }, void>({
      query: () => ({
        url: 'pay-types/sync',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => {
        const data = unwrapData<{ count?: number; list?: string[] }>(response);
        return { count: data.count ?? 0, list: Array.isArray(data.list) ? data.list : [] };
      },
      invalidatesTags: ['PayTypes'],
    }),
    deletePayType: builder.mutation<void, string>({
      query: (payType) => ({
        url: 'pay-types',
        method: 'DELETE',
        body: { payType },
      }),
      invalidatesTags: ['PayTypes'],
    }),

    // HR: departments, positions, employees, schedules
    getDepartments: builder.query<any[], void>({
      query: () => 'departments',
      transformResponse: (response: unknown) => unwrapData<any[]>(response) ?? [],
      providesTags: ['Departments'],
    }),
    createDepartment: builder.mutation<
      any,
      { name: string; priority?: number; productGroupValues?: string[] | null }
    >({
      query: (body) => ({
        url: 'departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Departments'],
    }),
    updateDepartment: builder.mutation<
      any,
      { id: string; name: string; priority?: number; productGroupValues?: string[] | null }
    >({
      query: ({ id, ...body }) => ({
        url: `departments/${encodeURIComponent(id)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Departments'],
    }),
    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({
        url: `departments/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Departments'],
    }),

    getPositions: builder.query<any[], void>({
      query: () => 'positions',
      transformResponse: (response: unknown) => unwrapData<any[]>(response) ?? [],
      providesTags: ['Positions'],
    }),
    createPosition: builder.mutation<any, { name: string; priority?: number }>({
      query: (body) => ({
        url: 'positions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Positions'],
    }),
    updatePosition: builder.mutation<any, { id: string; name: string; priority?: number }>({
      query: ({ id, ...body }) => ({
        url: `positions/${encodeURIComponent(id)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Positions'],
    }),
    deletePosition: builder.mutation<void, string>({
      query: (id) => ({
        url: `positions/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Positions'],
    }),

    getUsers: builder.query<any[], { includeInSchedule?: boolean; departmentId?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.includeInSchedule === true) search.set('includeInSchedule', 'true');
        if (params?.departmentId) search.set('departmentId', params.departmentId);
        const qs = search.toString();
        return `users${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: unknown) => unwrapData<any[]>(response) ?? [],
      providesTags: ['Users'],
    }),
    createUser: builder.mutation<
      any,
      {
        name: string;
        email: string;
        password: string;
        role?: string;
        scheduleAccessRole?: string;
        includeInSchedule?: boolean;
        departmentId?: string | null;
        positionId?: string | null;
        hourlyRate?: number | null;
      }
    >({
      query: (body) => ({
        url: 'users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<
      any,
      {
        id: string;
        payload: {
          name?: string;
          email?: string;
          password?: string;
          role?: string;
          scheduleAccessRole?: string;
          includeInSchedule?: boolean;
          departmentId?: string | null;
          positionId?: string | null;
          hourlyRate?: number | null;
        };
      }
    >({
      query: ({ id, payload }) => ({
        url: `users/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `users/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),

    getSchedules: builder.query<
      any[],
      { userId?: string; from?: string; to?: string; departmentId?: string } | void
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.userId) search.set('userId', params.userId);
        if (params?.from) search.set('from', params.from);
        if (params?.to) search.set('to', params.to);
        if (params?.departmentId) search.set('departmentId', params.departmentId);
        const qs = search.toString();
        return `schedules${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: unknown) => unwrapData<any[]>(response) ?? [],
      providesTags: ['Schedules'],
    }),
    createSchedule: builder.mutation<
      any,
      { userId: string; date: string; startTime?: string; endTime?: string; notes?: string }
    >({
      query: (body) => ({
        url: 'schedules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Schedules'],
    }),
    updateSchedule: builder.mutation<
      any,
      { id: string; payload: { date?: string; startTime?: string; endTime?: string; notes?: string } }
    >({
      query: ({ id, payload }) => ({
        url: `schedules/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Schedules'],
    }),
    deleteSchedule: builder.mutation<void, string>({
      query: (id) => ({
        url: `schedules/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schedules'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useGetIikoCredentialsQuery,
  useSaveIikoCredentialsMutation,
  useGetProductCostReportMutation,
  useGetStoreBalanceReportMutation,
  useGetProductsQuery,
  useSyncProductsMutation,
  useDeleteProductMutation,
  useFetchOlapReportMutation,
  useGetSettingsQuery,
  useSaveSettingsMutation,
  useGetDeliveryFlagValuesQuery,
  useSyncDeliveryFlagValuesMutation,
  useDeleteDeliveryFlagValueMutation,
  useGetProductGroupValuesQuery,
  useSyncProductGroupValuesMutation,
  useDeleteProductGroupValueMutation,
  useGetPointsQuery,
  useSyncPointsMutation,
  useGetPointDepartmentLinksQuery,
  useSetPointDepartmentMutation,
  useUnsetPointDepartmentMutation,
  useDeletePointMutation,
  useGetPayTypesQuery,
  useSyncPayTypesMutation,
  useDeletePayTypeMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetPositionsQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} = api;

