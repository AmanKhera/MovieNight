import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import Message, User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"
        self.user = self.scope["user"]

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Mark user online
        if self.user.is_authenticated:
            await self.set_user_online(self.user.id, True)
            await self.broadcast_presence(True)

        await self.send_latest_messages()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        # Mark user offline
        if self.user.is_authenticated:
            await self.set_user_online(self.user.id, False)
            await self.broadcast_presence(False)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "chat.message":
            sender_id = data["message"]["sender_id"]
            content = data["message"]["content"]
            saved = await self.save_message(sender_id, content)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "sender_id": saved.user_sending_id,
                        "message_content": saved.message_content,
                        "timestamp": saved.date_sent.isoformat(),
                        "status": saved.status,
                    }
                },
            )

        elif msg_type == "fetch_messages":
            page = data.get("page", 1)
            await self.send_latest_messages(page)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat.message",
            "message": event["message"],
        }))

    async def chat_presence(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
            "last_seen": event["last_seen"],
        }))

    async def send_latest_messages(self, page=1, page_size=20):
        offset = (page - 1) * page_size
        messages = await self.get_recent_messages(offset, page_size)
        await self.send(text_data=json.dumps({
            "type": "chat.history",
            "messages": messages,
        }))

    async def broadcast_presence(self, is_online):
        """Notify others in the room of this user's status"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_presence",
                "user_id": self.user.id,
                "is_online": is_online,
                "last_seen": datetime.utcnow().isoformat() if not is_online else None,
            }
        )

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

        return [
            {
                "sender_id": msg.user_sending_id,
                "message_content": msg.message_content,
                "timestamp": msg.date_sent.isoformat(),
                "status": msg.status,
            }
            for msg in qs.order_by("-date_sent")[offset:offset + limit][::-1]
        ]

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

    @database_sync_to_async
    def set_user_online(self, user_id, online):
        user = User.objects.filter(id=user_id).first()
        if user:
            user.is_online = online
            user.last_seen = datetime.utcnow()
            user.save()
