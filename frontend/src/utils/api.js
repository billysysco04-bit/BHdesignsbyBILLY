import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  getTemplates: async () => {
    const response = await axios.get(`${API_URL}/templates`);
    return response.data;
  },

  createMenu: async (title, templateId = null) => {
    const response = await axios.post(
      `${API_URL}/menus`,
      { title, template_id: templateId },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  getMenus: async () => {
    const response = await axios.get(`${API_URL}/menus`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getMenu: async (menuId) => {
    const response = await axios.get(`${API_URL}/menus/${menuId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  updateMenu: async (menuId, data) => {
    const response = await axios.put(
      `${API_URL}/menus/${menuId}`,
      data,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  deleteMenu: async (menuId) => {
    const response = await axios.delete(`${API_URL}/menus/${menuId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  generateDescription: async (dishName, ingredients = '', style = 'professional') => {
    const response = await axios.post(
      `${API_URL}/ai/generate-description`,
      { dish_name: dishName, ingredients, style },
      { headers: getAuthHeader() }
    );
    return response.data;
  }
};
