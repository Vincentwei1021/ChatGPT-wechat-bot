import { ChatGPTClient } from "@waylaidwanderer/chatgpt-api";
import config from "./config.js";


const cacheOptions = {
  // Options for the Keyv cache, see https://www.npmjs.com/package/keyv
  // This is used for storing conversations, and supports additional drivers (conversations are stored in memory by default)
  // For example, to use a JSON file (`npm i keyv-file`) as a database:
  // store: new KeyvFile({ filename: 'cache.json' }),
};

export default class ChatGPT {
  private chatGPT: any;
  private chatOption: any;
  constructor(clientOptions) {
    this.chatGPT = new ChatGPTClient(
      config.OPENAI_API_KEY,
      {
        ...clientOptions,
        reverseProxyUrl: config.reverseProxyUrl,
      },
      cacheOptions
    );
    this.chatOption = {};
    // this.test();
  }
  async test() {
    const response = await this.chatGPT.sendMessage("hello");
    console.log("response test: ", response);
  }
  async getChatGPTReply(content, contactId) {
    const data = await this.chatGPT.sendMessage(
      content,
      this.chatOption[contactId]
    );
    const { response, conversationId, messageId } = data;
    this.chatOption = {
      [contactId]: {
        conversationId,
        parentMessageId: messageId,
      },
    };
    console.log("response: ", response);
    // response is a markdown-formatted string
    return response;
  }

  async replyMessage(contact, content, contactName) {
    const { id: contactId } = contact;
    try {
      if (content === "resetAll" && contactName === "Vincent"
      ) {
        this.chatOption = {};
        await contact.say("已重启智能体");
        return;
      }
      else if (
        content.trim().toLocaleLowerCase() ===
        config.resetKey.toLocaleLowerCase()
      ) {
        this.chatOption = {
          ...this.chatOption,
          [contactId]: {},
        };
        await contact.say("相关记忆已被抹除");
        return;
      }

      const message = await this.getChatGPTReply(content, contactId);

      if (
        (contact.topic && contact?.topic() && config.groupReplyMode) ||
        (!contact.topic && config.privateReplyMode)
      ) {
        const result = content + "\n-----------\n" + message;
        await contact.say(result);
        return;
      } else {
        await contact.say(message);
      }
    } catch (e: any) {
      console.error(e);
      if (e.message.includes("timed out")) {
        await contact.say(
          content +
            "\n-----------\nERROR: Please try again, ChatGPT timed out for waiting response."
        );
      }
    }
  }
}
