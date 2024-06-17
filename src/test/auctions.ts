import auctionRest from '@/rest/auction'
import { GetContactListItem } from '@/rest/types/auction/getContactList'


interface IState {
  contactList: GetContactListItem[]
  currentSelectedContactId: number
  defaultContactId: number
}
const showErrorMessage = (message) => {
  uni.showToast({
    icon: 'none',
    title: message || '发生未知错误'
  })
}

const state: IState = {
  contactList: [],
  currentSelectedContactId: 0,
  defaultContactId: 0,
}

const getters = {
  currentSelectedContactId: (state: IState) => state.currentSelectedContactId,
  defaultContactId: (state: IState) => state.defaultContactId,
  contactList: (state: IState): GetContactListItem[] => state.contactList
}

const mutations = {
  setContactList (state: IState, list = []) {
    state.contactList = list
  },
  setCurrentSelectedContactId (state: IState, id = 0) {
    state.currentSelectedContactId = id
  },
  // 默认地址的id，此处分开选中的id和默认地址的id是为了减少逻辑判断，避免接口数据不一致导致的问题
  setDefaultContactId (state: IState, id = 0) {
    state.defaultContactId = id
  }
}

const actions = {
  async fetchAuctionContactList({ commit, state }) {
    try {
      if (state.currentSelectedContactId?.id) return
      const { code, data } = await auctionRest.getContactList()
      if (code !== 0) return
      commit('setContactList', data.contacts)
      if (data.contacts.length <= 0) return
      const defaultContact = data.contacts.find((item) => item.is_default_contact)
      commit('setDefaultContactId', defaultContact?.id)
      // 如果没有选中任何人，则给到默认地址
      if (!state.currentSelectedContactId) {
        commit('setCurrentSelectedContactId', defaultContact?.id)
      }
    }catch {
      showErrorMessage('获取看车联系人列表失败')
    }
  }
}

export default {
  state,
  getters,
  mutations,
  actions,
  namespaced: true
}
