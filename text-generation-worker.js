import {
  pipeline,
  TextStreamer,
} from "./lib/transformersjs/transformers.min.js";

let _textGenerator;
async function getTextGenerator() {
  if (!_textGenerator)
    _textGenerator = pipeline(
      "text2text-generation",
      "Xenova/LaMini-Flan-T5-77M", // or 248M or 783M
      { dtype: "q8" },
    );
  return _textGenerator;
}

self.onmessage = async (e) => {
  const { id, prompt } = e.data;
  const generator = await getTextGenerator();

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (text) => {
      self.postMessage({ id, type: "token", text });
    },
  });

  await generator(prompt, { max_new_tokens: 40, streamer });
  self.postMessage({ id, type: "done" });
};
