
import axios from "axios";

const client = axios.create({
  baseURL: "https://regen-api-endpoint.com"
});

export default client;
