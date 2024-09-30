import { acceptHMRUpdate } from "pinia";
import { defineStore } from "pinia";
import { Message } from 'element-ui';
import rest from "@/rest/config";
interface ContactItem {
  'company_name': string;
  'contact_name': string;
  'mobile_number': string;
  'create_time': string;
}
export interface State {
  contactInfoList: ContactItem[];
  page: number;
  count: number;
  totalCount: number;
}
export const useAllAccountsStore = defineStore({
  id: "allAccounts",
  state: (): State => ({
    contactInfoList: [],
    page: 1,
    count: 10,
    totalCount: 0
  }),
  actions: {
    /**
     * 获取列表
     */
    async getContactInfosList(params) {
      const res = await rest.cooperate.getContactInfosList(params);
      if (res.code === 0) {
        this.contactInfoList = res.data.contact_infos;
        this.totalCount = res.data.total_count;
        this.page = res.data.page;
        this.count = res.data.count;
      } else {
        Message.error(res.message || '未知错误');
      }
    }
  }
});
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAllAccountsStore, import.meta.hot));
}