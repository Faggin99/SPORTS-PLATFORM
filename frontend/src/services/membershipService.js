import { api } from './api';

export const membershipService = {
  async listMembers(clubId) {
    return await api.get(`/clubs/${clubId}/members`);
  },
  async invite(clubId, { email, role, category_ids, permissions }) {
    return await api.post(`/clubs/${clubId}/invite`, { email, role, category_ids, permissions });
  },
  async updateMember(clubId, memberId, { role, category_ids, permissions }) {
    return await api.put(`/clubs/${clubId}/members/${memberId}`, { role, category_ids, permissions });
  },
  // Alias retrocompat
  async updateRole(clubId, memberId, role, category_ids) {
    return await api.put(`/clubs/${clubId}/members/${memberId}`, { role, category_ids });
  },
  async remove(clubId, memberId) {
    return await api.delete(`/clubs/${clubId}/members/${memberId}`);
  },
  async getInvite(token) {
    return await api.get(`/invites/${token}`);
  },
  async acceptInvite(token) {
    return await api.post(`/invites/${token}/accept`, {});
  },
};
