import axios from 'axios';
import configs from './configs';

const apiClient = {
  configs: configs
};

apiClient.reSetConfig = (config) => {
  apiClient.configs = {
    ...apiClient.configs,
    ...config
  };
};

apiClient.getInstance = (baseUrl = apiClient.configs.webrtc_url, customConfigs = {}) => {
  const client = axios.create({
    baseURL: baseUrl,
    withCredentials: false,
    crossDomain: true,
    headers: {
      "Accept": "application/json",
      "Content-type": "application/json",
      ...apiClient.configs.axios.headers
    },
    ...customConfigs
  });

  client.interceptors.request.use(async (request) => {
    // modify request before send
    return request
  });

  client.defaults.validateStatus = (status) => {
    // validate response status
    return status >= 200 && status < 300;
  };

  return client;
};

export default apiClient;
