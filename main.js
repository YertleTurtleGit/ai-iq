import { pipeline } from "./lib/transformersjs/transformers.min.js";

const NUMBER_OF_ROUNDS = 3;

const WORD_A = document.getElementById("word-a");
const WORD_B = document.getElementById("word-b");
const WORD_C = document.getElementById("word-c");

const QUESTION_CONTAINER = document.getElementById("question-container");
const QUESTION = document.getElementById("question");
const QUESTION_INPUT = document.getElementById("question-input");

const RESULT_CONTAINER = document.getElementById("result-container");
const RESULT_QUESTIONS = document.getElementById("result-questions");

const TEXT_EMBEDDING_MODEL = [
  "feature-extraction",
  "Xenova/all-mpnet-base-v2",
  { dtype: "q8" },
];

const ROUND_WORDS = [];

let _wordList;
async function getWordList() {
  if (!_wordList) {
    await new Promise((resolve) => {
      fetch("words.txt")
        .then((response) => response.text())
        .then((text) => {
          _wordList = text.split("\n").map((line) => line.trim());
          resolve();
        });
    });
  }
  return _wordList;
}

let _embeddingPipeline;
async function getEmbeddingPipeline() {
  if (!_embeddingPipeline)
    _embeddingPipeline = pipeline(...TEXT_EMBEDDING_MODEL);
  return _embeddingPipeline;
}

async function getWordDistance(wordA, wordB) {
  const embeddingPipeline = await getEmbeddingPipeline();

  const wordAEmbedding = embeddingPipeline(wordA, {
    pooling: "mean",
    normalize: true,
  });
  const wordBEmbedding = embeddingPipeline(wordB, {
    pooling: "mean",
    normalize: true,
  });

  const a = (await wordAEmbedding).data;
  const b = (await wordBEmbedding).data;
  return (
    a.reduce((dot, val, i) => dot + val * b[i], 0) /
    (Math.sqrt(a.reduce((sum, val) => sum + val * val, 0)) *
      Math.sqrt(b.reduce((sum, val) => sum + val * val, 0)))
  );
}

async function fillWords() {
  const wordList = await getWordList();
  const indices = new Set();
  while (indices.size < 3) {
    indices.add(Math.round(Math.random() * (wordList.length - 1)));
  }

  const indicesIterator = indices.values();
  WORD_A.innerText = wordList[indicesIterator.next().value];
  WORD_B.innerText = wordList[indicesIterator.next().value];
  WORD_C.innerText = wordList[indicesIterator.next().value];
}

async function submitButtonPress() {
  await new Promise((resolve) => {
    QUESTION.addEventListener("submit", (event) => {
      event.preventDefault();
      resolve();
    });
  });
}

async function showResults() {
  QUESTION_CONTAINER.style.display = "none";
  RESULT_CONTAINER.style.display = "flex";

  const DISTANCES = new Array(NUMBER_OF_ROUNDS);

  for (let roundIndex = 0; roundIndex < NUMBER_OF_ROUNDS; roundIndex++) {
    const roundWords = ROUND_WORDS[roundIndex];

    const roundDiv = document.createElement("div");
    roundDiv.classList.add("round-result");
    RESULT_QUESTIONS.append(roundDiv);
    const givenRoundPairDiv = document.createElement("div");
    givenRoundPairDiv.classList.add("round-pair");
    const givenRoundPairSpan = document.createElement("span");
    const givenRoundPairProgress = document.createElement("progress");
    const guessedRoundPairDiv = document.createElement("div");
    guessedRoundPairDiv.classList.add("round-pair");
    const guessedRoundPairSpan = document.createElement("span");
    const guessedRoundPairProgress = document.createElement("progress");
    const roundResultDistanceDiv = document.createElement("div");
    roundResultDistanceDiv.classList.add("round-result-distance");

    roundDiv.append(
      givenRoundPairDiv,
      guessedRoundPairDiv,
      roundResultDistanceDiv,
    );
    givenRoundPairDiv.append(givenRoundPairProgress, givenRoundPairSpan);
    guessedRoundPairDiv.append(guessedRoundPairProgress, guessedRoundPairSpan);

    givenRoundPairProgress.value = null;
    givenRoundPairSpan.innerText = roundWords[0] + " 📏 " + roundWords[1];
    guessedRoundPairSpan.innerText = roundWords[2] + " 📏 " + roundWords[3];

    setTimeout(async () => {
      const roundDistances = [
        await getWordDistance(roundWords[0], roundWords[1]),
        await getWordDistance(roundWords[2], roundWords[3]),
      ];
      DISTANCES[roundIndex] = roundDistances;

      givenRoundPairSpan.innerText +=
        " (" + Math.round(100 * (1 - roundDistances[0])) + "cm)";
      guessedRoundPairSpan.innerText +=
        " (" + Math.round(100 * (1 - roundDistances[1])) + "cm)";

      givenRoundPairProgress.value = 1 - roundDistances[0];
      guessedRoundPairProgress.value = 1 - roundDistances[1];
      roundResultDistanceDiv.innerText =
        "your error: " +
        Math.round(100 * Math.abs(roundDistances[0] - roundDistances[1])) +
        "%";
    });
  }
}

async function initialize() {
  for (let roundId = 0; roundId < NUMBER_OF_ROUNDS; roundId++) {
    await fillWords();
    await submitButtonPress();
    ROUND_WORDS.push([
      WORD_A.innerText,
      WORD_B.innerText,
      WORD_C.innerText,
      QUESTION_INPUT.value,
    ]);
    QUESTION_INPUT.value = "";
  }

  showResults();
}

setTimeout(initialize);
