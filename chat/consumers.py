import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        # await self.send_latest_messages()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

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

    async def send_latest_messages(self, page=1, page_size=20):
        offset = (page - 1) * page_size
        messages = await self.get_recent_messages(offset, page_size)
        await self.send(text_data=json.dumps({
            "type": "chat.history",
            "messages": messages,
        }))

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
            message_content=content
        )
