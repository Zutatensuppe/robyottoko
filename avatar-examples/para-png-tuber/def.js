// assets by twitch.tv/lisadikaprio

export default {
  name: 'para',
  default: {
    slot: {
      face: '/static/avatar-examples/para-png-tuber/1-Face.png',
      eye: '/static/avatar-examples/para-png-tuber/2-Eyes.png',
      mouth: '/static/avatar-examples/para-png-tuber/4-mouthHappy.png',
      eyebrows: '/static/avatar-examples/para-png-tuber/3-browsAngry.png',
    },
  },
  slotDefinitions: [
    {
      slot: 'face',
      items: [
        { url: '/static/avatar-examples/para-png-tuber/1-Face.png', title: 'default' }
      ]
    },
    {
      slot: 'eye',
      items: [
        {
          url: '/static/avatar-examples/para-png-tuber/2-Eyes.png',
          title: 'default',
          animation: {
            default: [
              { url: '/static/avatar-examples/para-png-tuber/2-Eyes.png', duration: 5000 },
              { url: '/static/avatar-examples/para-png-tuber/2-EyesClosed.png', duration: 500 },
            ],
            sleep: [
              { url: '/static/avatar-examples/para-png-tuber/2-EyesClosed.png', duration: 1000 },
            ],
          },
        },
      ]
    },
    {
      slot: 'mouth',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/para-png-tuber/4-mouthAngry.png', title: 'angry',
          animation: {
            speaking: [
              { url: '/static/avatar-examples/para-png-tuber/4-mouthAngry.png', duration: 100 },
              { url: '/static/avatar-examples/para-png-tuber/4-mouthAngryOpen.png', duration: 100 },
            ],
          }, },
        { url: '/static/avatar-examples/para-png-tuber/4-mouthHappy.png', title: 'happy',
          animation: {
            speaking: [
              { url: '/static/avatar-examples/para-png-tuber/4-mouthHappy.png', duration: 100 },
              { url: '/static/avatar-examples/para-png-tuber/4-mouthHappyOpen.png', duration: 100 },
            ],
          }, },
      ]
    },
    {
      slot: 'eyebrows',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/para-png-tuber/3-browsAngry.png', title: 'angry' },
        { url: '/static/avatar-examples/para-png-tuber/3-browsHappy.png', title: 'happy' },
      ]
    },
    {
      slot: 'ears',
      items: [
        { url: null, title: 'default' },
        { url: '/static/avatar-examples/para-png-tuber/5-CatEars.png', title: 'Cat Ears',
          animation: {
            default: [
              { url: '/static/avatar-examples/para-png-tuber/5-CatEars.png', duration: 4000 },
              { url: '/static/avatar-examples/para-png-tuber/5-CatEarsDown.png', duration: 4000 },
            ],
            speaking: [
              { url: '/static/avatar-examples/para-png-tuber/5-CatEars.png', duration: 200 },
              { url: '/static/avatar-examples/para-png-tuber/5-CatEarsDown.png', duration: 200 },
            ],
          },
        },
      ]
    },
  ],
}
