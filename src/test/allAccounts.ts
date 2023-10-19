import { Message } from 'element-ui'
import { ActionTree, GetterTree, MutationTree } from 'vuex'

import rest from '../../rest/config'
import * as MutationTypes from '../mutationTypes'

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

const state: State = {
  contactInfoList: [],
  page: 1,
  count: 10,
  totalCount: 0
}

const mutations: MutationTree<State> = {
  [MutationTypes.UPDATE_USEDCAR_COOPERATE_INFO] (state: State, data) {
    state.contactInfoList = data.contact_infos
    state.totalCount = data.total_count
    state.page = data.page
    state.count = data.count
  }
}

const actions: ActionTree<State, any> = {
  /**
   * 获取列表
   */
  async getContactInfosList ({ commit }, params) {
    const res = await rest.cooperate.getContactInfosList(params)
    if (res.code === 0) {
      commit(MutationTypes.UPDATE_USEDCAR_COOPERATE_INFO, res.data)
    } else {
      Message.error(res.message || '未知错误')
    }
  }
}

const getters: GetterTree<State, any> = {
  contactInfoList (state: State) {
    return state.contactInfoList
  },
  totalCount (state: State) {
    return state.totalCount
  }
}

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations
}
