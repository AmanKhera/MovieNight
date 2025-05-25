import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import Message, User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(">>> CONNECTED USER:", self.scope["user"])
        print(">>> USER IS AUTHENTICATED:", self.scope["user"].is_authenticated)

        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send latest messages when user connects
        await self.send_latest_messages()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")

            if msg_type == "fetch_messages":
                page = data.get("page", 1)
                await self.send_latest_messages(page)

            elif msg_type == "chat.message":
                message_data = data.get("message", {})
                sender_id = message_data.get("sender_id")
                content = message_data.get("content")
                if not content:
                    return
                saved = await self.save_message(sender_id, content)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",  # match method name below
                        "message": {
                            "sender_id": saved.user_sending_id,
                            "message_content": saved.message_content,
                            "timestamp": saved.date_sent.isoformat(),
                        },
                    },
                )

        except Exception as e:
            print("WebSocket receive error:", e)
            # Optionally send error to client or close connection



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
        print(">>> SCOPE USER:", self.scope["user"])
        print(">>> USER ID:", self.scope["user"].id)


        if self.room_name.startswith("dm_"):
            other_id = int(self.room_name.split("_")[1])
            messages = Message.objects.filter(
                user_sending_id__in=[self.scope["user"].id, other_id],
                user_receiving_id__in=[self.scope["user"].id, other_id],
            ).order_by("-date_sent")[offset:offset + limit]

        elif self.room_name.startswith("group_"):
            group_id = int(self.room_name.split("_")[1])
            messages = Message.objects.filter(
                user_receiving_id=group_id
            ).order_by("-date_sent")[offset:offset + limit]

        else:
            return []

        return [
            {
                "sender_id": msg.user_sending_id,
                "message_content": msg.message_content,
                "timestamp": msg.date_sent.isoformat()
            }
            for msg in messages[::-1]
        ]

    @database_sync_to_async
    def save_message(self, sender_id, content):
        receiver_id = None
        if self.room_name.startswith("dm_"):
            receiver_id = int(self.room_name.split("_")[1])
        elif self.room_name.startswith("group_"):
            receiver_id = int(self.room_name.split("_")[1])

        return Message.objects.create(
            user_sending_id=sender_id,
            user_receiving_id=receiver_id,
            message_content=content
        )
