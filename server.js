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
readFile(join(__dirname, 'jobs.json'), 'utf-8').then(data => {
  jobs = JSON.parse(data);
});

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

function getRandomJob() {
  return jobs[Math.floor(Math.random() * jobs.length)];
}

const deathCauses = [
  "전쟁 중 전사", "전염병", "독살", "낙뢰", "익사", "화산 폭발",
  "맹수의 습격", "기아", "동사", "처형", "결투 패배", "추락사",
  "식중독", "자연재해", "암살", "탈진", "뱀에 물림", "폭풍우",
  "사형 선고", "미지의 질병", "노환", "실험 실패", "화재",
  "바다에서 실종", "광산 붕괴", "혁명 중 사망", "독버섯 섭취",
  "사냥 중 사고", "무너진 건물에 깔림", "열사병"
];

function getRandomDeath() {
  return deathCauses[Math.floor(Math.random() * deathCauses.length)];
}

app.post('/api/past-life', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }

  const year = getRandomYear();
  const job = getRandomJob();
  const death = getRandomDeath();
  const yearStr = formatYear(year);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 전생 이야기를 들려주는 신비로운 점술사입니다. 유저의 전생에 대해 흥미진진하고 드라마틱하게 스토리텔링 해주세요. 반드시 한국어로 답변하세요. 이야기는 300자 내외로 작성해주세요. 감성적이면서도 유머가 있게 작성해주세요. 마지막에 교훈이나 현생과의 연결고리를 한 줄 넣어주세요.`
        },
        {
          role: 'user',
          content: `이름: ${name}\n전생 시대: ${yearStr}\n전생 직업: ${job}\n사인: ${death}\n\n위 정보를 바탕으로 이 사람의 전생 이야기를 드라마틱하게 들려주세요.`
        }
      ],
      max_tokens: 1000,
      temperature: 1.0,
    });

    const story = completion.choices[0].message.content;

    res.json({
      name,
      year: yearStr,
      job,
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
