import axios from 'axios'
import configs from './configs'

const apiClient = {}

apiClient.getInstance = (baseUrl = configs.webrtc_url, customConfigs = {}) => {
  const client = axios.create(Object.assign({
    baseURL: baseUrl,
    withCredentials: false,
    crossDomain: true,
    headers: Object.assign({
      "Accept": "application/json",
      "Content-type": "application/json",
    }, configs.axios.headers),
  }, customConfigs))

  client.interceptors.request.use(async (request) => {
    // modify request before send
    return request
  })

  client.defaults.validateStatus = (status) => {
    // validate response status
    return status >= 200 && status < 300;
  }

  return client
}

export default apiClient
