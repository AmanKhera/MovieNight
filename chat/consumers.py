import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import Message, User

class ChatConsumer(AsyncWebsocketConsumer):
    #user enters chatroom
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"
        self.user = self.scope["user"]

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        if self.user.is_authenticated:
            await self.set_user_online(self.user.id, True)
            await self.broadcast_presence(True)

        #await self.send_latest_messages()

    #disconnect from web socket and chatroom and update user status when user disconnects
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if self.user.is_authenticated:
            await self.set_user_online(self.user.id, False)
            await self.broadcast_presence(False)

    #receive new messages
    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "chat.message":
            sender_id = data["message"]["sender_id"]
            content = data["message"]["content"]
            saved = await self.save_message(sender_id, content)
            sender_username = await self.get_username(saved.user_sending_id)

            print("Echoing message to room:", {
    "sender_id": saved.user_sending_id,
    "sender_username": sender_username,
    "content": saved.message_content
})

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "sender_channel_name": self.channel_name,
                    "message": {
                        "sender_id": saved.user_sending_id,
                        "sender_username": sender_username,
                        "message_content": saved.message_content,
                        "timestamp": saved.date_sent.isoformat(),
                        "status": saved.status,
                    }
                },
            )


        elif msg_type == "fetch_messages":
            page = data.get("page", 1)
            await self.send_latest_messages(page)

    #send message to chatroom
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat.message",
            "message": event["message"],
        }))

    #update user status in chatroom
    async def chat_presence(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
            "last_seen": event["last_seen"],
        }))
    
    #display previous messages when user enters a chatroom
    async def send_latest_messages(self, page=1, page_size=20):
        offset = (page - 1) * page_size
        messages = await self.get_recent_messages(offset, page_size)
        await self.send(text_data=json.dumps({
            "type": "chat.history",
            "messages": messages,
        }))

    #display change change in users online status when they enter or leave a chatroom
    async def broadcast_presence(self, is_online):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_presence",
                "user_id": self.user.id,
                "is_online": is_online,
                "last_seen": datetime.utcnow().isoformat() if not is_online else None,
            }
        )

    #fetch previous messages
    @database_sync_to_async
    def get_recent_messages(self, offset, limit):
        if self.room_name.startswith("dm_"):
            parts = self.room_name.split("_")
            if len(parts) == 3:
                user1, user2 = int(parts[1]), int(parts[2])
                qs = Message.objects.filter(
                    user_sending_id__in=[user1, user2],
                    user_receiving_id__in=[user1, user2],
                )
            else:
                return []

        elif self.room_name.startswith("group_"):
            group_id = int(self.room_name.split("_")[1])
            qs = Message.objects.filter(user_receiving_id=group_id)
        else:
            return []

        #prefetch sender usernames
        qs = qs.select_related("user_sending")

        return [
            {
                "sender_id": msg.user_sending_id,
                "sender_username": msg.user_sending.username,
                "message_content": msg.message_content,
                "timestamp": msg.date_sent.isoformat(),
                "status": msg.status,
            }
            for msg in qs.order_by("-date_sent")[offset:offset + limit][::-1]
        ]

    
    #save message to message table
    @database_sync_to_async
    def save_message(self, sender_id, content):
        room_type, room_id = self.room_name.split("_", 1)
        receiver_id = int(room_id.split("_")[1] if room_type == "dm" else room_id)

        return Message.objects.create(
            user_sending_id=sender_id,
            user_receiving_id=receiver_id,
            message_content=content,
            status="sent"
        )

    #change user status to online in user table
    @database_sync_to_async
    def set_user_online(self, user_id, online):
        user = User.objects.filter(id=user_id).first()
        if user:
            user.is_online = online
            user.last_seen = datetime.utcnow()
            user.save()

    @database_sync_to_async
    def get_username(self, user_id):
        return User.objects.filter(id=user_id).values_list("username", flat=True).first()
