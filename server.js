import express from 'express';
import { OpenAI } from 'openai';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.openai_api_key });

let jobs = [];
let beings = [];
let deaths = [];

Promise.all([
  readFile(join(__dirname, 'jobs.json'), 'utf-8').then(data => { jobs = JSON.parse(data); }),
  readFile(join(__dirname, 'beings.json'), 'utf-8').then(data => { beings = JSON.parse(data); }),
  readFile(join(__dirname, 'deaths.json'), 'utf-8').then(data => { deaths = JSON.parse(data); }),
]);

function getRandomYear() {
  // -150000 ~ 1980 사이 랜덤
  const min = -150000;
  const max = 1980;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatYear(year) {
  if (year < 0) return `기원전 ${Math.abs(year)}년`;
  return `${year}년`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 50% 확률로 인간 직업, 50% 확률로 비인간 존재
function getRandomIdentity() {
  if (Math.random() < 0.5) {
    return { type: '직업', value: pick(jobs) };
  }
  return { type: '존재', value: pick(beings) };
}

function getRandomDeath() {
  return pick(deaths);
}

app.post('/api/past-life', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }

  const year = getRandomYear();
  const identity = getRandomIdentity();
  const death = getRandomDeath();
  const yearStr = formatYear(year);
  const identityLabel = identity.type === '직업' ? '전생 직업' : '전생 존재';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 전생 이야기를 들려주는 신비로운 점술사입니다. 유저의 전생에 대해 흥미진진하고 드라마틱하게 스토리텔링 해주세요. 반드시 한국어로 답변하세요. 이야기는 300자 내외로 작성해주세요. 전생이 인간이 아닐 수도 있습니다(동물, 무생물, 미생물, 외계인, 유령 등). 비인간 존재일 경우 그 존재의 관점에서 1인칭으로 생생하게 묘사해주세요. 사인이 웃길 경우 코미디 톤으로 작성해주세요. 마지막에 교훈이나 현생과의 연결고리를 한 줄 넣어주세요.`
        },
        {
          role: 'user',
          content: `이름: ${name}\n전생 시대: ${yearStr}\n${identityLabel}: ${identity.value}\n사인: ${death}\n\n위 정보를 바탕으로 이 사람의 전생 이야기를 드라마틱하게 들려주세요.`
        }
      ],
      max_tokens: 1000,
      temperature: 1.0,
    });

    const story = completion.choices[0].message.content;

    res.json({
      name,
      year: yearStr,
      job: identity.value,
      death,
      story,
    });
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'AI 스토리 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
