class UserMessage:
    def __init__(self, text: str):
        self.text = text

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message

    def with_model(self, provider: str, model_name: str):
        return self

    async def send_message(self, message: UserMessage) -> str:
        return "I'm a mock AI helper. Let me know how I can assist you!"
