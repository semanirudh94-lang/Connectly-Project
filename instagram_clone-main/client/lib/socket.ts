import { io } from "socket.io-client"

const URL = process.env.BACKEND_URL
export const socket = io(URL, {
    autoConnect: false,
    transports: ["websocket"]
})