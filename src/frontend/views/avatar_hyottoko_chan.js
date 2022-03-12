export default {
  "name": "Hyottoko-Chan",
  "width": 400,
  "height": 400,
  "stateDefinitions": [
    {
      "value": "default",
      "deletable": false
    },
    {
      "value": "speaking",
      "deletable": false
    },
    {
      "value": "brb",
      "deletable": true
    }
  ],
  "slotDefinitions": [
    {
      "slot": "Base",
      "defaultItemIndex": 0,
      "items": [
        {
          "title": "Default Clothing",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/bVyo1l-BASE.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/JFvasz-2022-01-30T01_30_40.133Z-xUI5QQ.png",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Neko Maid",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/CnWpBL-BASE 2.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/xV8vXJ-brb2.png",
                  "duration": 100
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "slot": "Eyes",
      "defaultItemIndex": 1,
      "items": [
        {
          "title": "Calm",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/NO7zrl-eyes-calm.png",
                  "duration": "4500"
                },
                {
                  "url": "https://hyottoko.club/uploads/nmUEqi-eyes-closed.png",
                  "duration": "150"
                }
              ]
            },
            {
              "state": "speaking",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/9eidC9-l2idid-eyes-calm.png",
                  "duration": "4500"
                },
                {
                  "url": "https://hyottoko.club/uploads/pw1HJw-nmUEqi-eyes-closed.png",
                  "duration": "150"
                }
              ]
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Interested",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/2wlpCr-eyes-interested.png",
                  "duration": "4500"
                },
                {
                  "url": "https://hyottoko.club/uploads/DwiBor-eyes-closed.png",
                  "duration": "150"
                }
              ]
            },
            {
              "state": "speaking",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/5fP25n-eyes-interested.png",
                  "duration": "4500"
                },
                {
                  "url": "https://hyottoko.club/uploads/PYiAtV-eyes-closed.png",
                  "duration": "150"
                }
              ]
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Focused",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/LQkiXq-eyes-down-focused.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "slot": "Mouth",
      "defaultItemIndex": 0,
      "items": [
        {
          "title": "Confused",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/GkDE45-mouth-confused-open.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/snKSAf-mouth-open.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Mild Smile",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/TTeOCx-mouth-mild-smile.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/gjs4vW-mouth-open.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Focused",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/bbpNaD-mouth-focused.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "slot": "Hands + Table",
      "defaultItemIndex": 0,
      "items": [
        {
          "title": "Empty",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": []
            }
          ]
        },
        {
          "title": "Mouse Study",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/YJnPbG-mouse-study.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Tablet",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/MNHy2s-tablet-osu.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Hands Knitting",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/pn9ZlM-knitting-hands2.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        },
        {
          "title": "Hands Cross Stitch",
          "states": [
            {
              "state": "default",
              "frames": [
                {
                  "url": "https://hyottoko.club/uploads/XZRYyh-crossstitch-hands.png",
                  "duration": 100
                }
              ]
            },
            {
              "state": "speaking",
              "frames": []
            },
            {
              "state": "brb",
              "frames": [
                {
                  "url": "",
                  "duration": 100
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
