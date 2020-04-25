const puppeteer = require("puppeteer");
const secrets = require("./secrets");

const BASE_URL = "https://cyberteachers.eberlitz.com/digital/rest";
const SECRET_USER = secrets.username;
const SECRET_PW = secrets.password;

sleep = (milliseconds) => {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

formatArr = (arr) => {
  let _new = [[]];
  let between = false;
  let j = 0;
  let ans = [];

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == "'") {
      if (between == true) {
        between = false;
      } else {
        j += 1;
        _new.push(new Array());
        between = true;
      }
    } else {
      if (between == true) {
        _new[j].push(arr[i]);
      }
    }
  }

  for (let i = 0; i < _new.length; i++) {
    if (_new[i].length > 0) {
      ans.push(_new[i].join(""));
    }
  }

  return ans;
}

programFinder = async (page) => {
  let i = await page.evaluate(() => {
    const nodes = document.querySelectorAll(".accordion-heading");

    const index = (function () {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes[i].children.length; j++) {
          if (nodes[i].children[j].className.includes("accordion-progress")) {
            if (!nodes[i].children[j].children[1].textContent.includes("100")) {
              return i + 1;
            }
          } 
        }
      }
      return -1;
    })();

    return index;
  });

  return i;
}

init = async () => {
  try {
    const browser = await puppeteer.launch({headless: false});
    const [page] = await browser.pages();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    await page.goto(BASE_URL + "/login");

    await page.waitForSelector('.login--form-login');
    await page.type('input#j_username', SECRET_USER);
    await page.type('input#password', SECRET_PW);
    await page.click('.btn.btn-default');

    sleep(5000);

    await page.goto(BASE_URL + "/#/program");

    await page.waitFor("body");

    sleep(10000);

    let index = await programFinder(page);

    while (index == -1) {
       await page.evaluate(async () => {
        await document.querySelector("a[ng-click='nextPage()']").click();
      });
      
      sleep(1500);
      
      index = await programFinder(page);
    }

    await page.waitFor("#header" + index.toString());

    await page.evaluate(async (index) => {
      await document.querySelector("#header" + index.toString()).children[4].children[0].click();
    }, index);

    sleep(1000);

    await page.waitFor("body");
    
    sleep(5000);

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

sectionIdentifier = async (page) => {
  const sectionClasses = await page.evaluate(() => {
    return document.getElementsByTagName("body")[0].className;
  });

  if (sectionClasses.includes("vocabulary-presentation")) {
    await vocabularyPresentation(page);
  } else if (sectionClasses.includes("word-choice")) {
    await wordChoice(page);
  } else if (sectionClasses.includes("ficheFonctionnelle")) {
    await ficheFonctionnelle(page);
  } else if (sectionClasses.includes("sentence-ordering")) { 
    await sentenceOrdering(page);
  } else if (sectionClasses.includes("fill-blank-in-text")) {
    await fillInBlankText(page);
  } else if (sectionClasses.includes("qcm-video") || sectionClasses.includes("qcm-audio")) {
    await qcmVideo(page);
  } else if (sectionClasses.includes("writing-assistant")) { // in one program this class appears more than one time, careful
    await writingAssistant(page);
  } else if (sectionClasses.includes("speaking-role-play")) {
    await speakingRolePlay(page);
  } else if (sectionClasses.includes("drag-n-drop-generic")) {
    await dragNDropGeneric(page);
  } else if (sectionClasses.includes("section-program")) {
    await sectionProgram(page);
  } else if (sectionClasses.includes("qcm")) {
    console.log("qcm");
  } else if (sectionClasses.includes("fill-blank")) {
    await fillBlank(page);
  } else if (sectionClasses.includes("blank-sentence drag-n-drop")) {
    await blankSentence(page);
  } else {
    console.log("FOUND EXERCISE WE DIDNT ACCOUNT FOR, CLASSES:", sectionClasses);
  }

  return;
}

fillBlank = async (page) => {
  try {
    await page.waitFor("body");

    sleep(5000)

    const fields = await page.evaluate(() => {
      const elements = document.querySelectorAll(`input[name='responseId']`);
      let arr = []

      for (let i = 0; i < elements.length; i++) {
        arr.push(elements[i])
      }
      return arr;
    });

    const answers = await page.evaluate(() => {
        const elements = document.querySelectorAll(`input[name='responseId']`);
        let answers = [];
        
        for (let i = 0; i < elements.length; i++) {
          answers.push(elements[i].getAttribute("correctresponse"));
        }

        return answers;
    });

    for (let i = 0; i < fields.length; i++) {
      await page.type(`input[correctresponse="${answers[i]}"]`, answers[i]);
    }

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

wordChoice = async (page) => {
  try {
    let res00 = "select[name='res[0][0]']";

    await page.waitFor(res00);

    const selects = await page.evaluate(() => Array.from(document.querySelectorAll(`select.blank-input`), element => element.name));
    const stringArr = await page.evaluate(() => document.querySelector("input#correctAnswers").value);
    const answers = formatArr(stringArr);

    for (let i = 0; i < answers.length; i++) {
      await page.type("select[name='" + selects[i] + "']", answers[i]);
    }

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

vocabularyPresentation = async (page) => {
  try {
    await page.waitFor(".btn-last");

    await page.evaluate(() => {
      document.querySelector(".btn-last").click();
    })

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

speakingRolePlay = async (page) => {
  try {
    await page.waitFor(".btn-retry");

    await page.evaluate(() => {
      document.querySelector(`a[name='nextBte']`).click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

fillInBlankText = async (page) => {
  try {
    await page.waitFor(".exercice-content");

    const snaptargets = await page.evaluate(async () => {
      const snaptargets = document.querySelectorAll(".snaptarget");

      let elements = [];

      for (let i = 0; i < snaptargets.length; i++) {
        let tag = snaptargets[i].getAttribute("correct");
        let bounds = snaptargets[i].getBoundingClientRect();

        let finalX = parseInt(bounds.x + (bounds.width/2));
        let finalY = parseInt(bounds.y + (bounds.height/2));

        let coords = [finalX, finalY];
        elements.push({[tag]: coords});
      }

      return elements;
    });

    for (let i = 0; i < snaptargets.length; i++) {
      const draggableCoords = await page.evaluate(async (ans) => {
        const bounds = document.querySelector(`[ans='${ans}']`).getBoundingClientRect();
        return [(bounds.x + bounds.width*0.33), (bounds.y + bounds.height/2)];
      }, Object.keys(snaptargets[i])[0]);

      let finalX = snaptargets[i][Object.keys(snaptargets[i])[0]][0];
      let finalY = snaptargets[i][Object.keys(snaptargets[i])[0]][1];
      
      await page.mouse.move(draggableCoords[0] + 5, draggableCoords[1]);
      await page.mouse.down();
      await page.mouse.move(finalX, finalY);
      await page.mouse.up();
    }

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

sentenceOrdering = async (page) => {
  try {
    await page.waitFor(".dialog-text");

    let answerOrder = await page.evaluate(() => {
      let arr = [];
      const elements = document.querySelectorAll(".show_answer");

      for (let i = 0; i < elements.length; i++) {
        arr.push(elements[i].textContent);
      }

      return arr;
    });

    for (let i = 0; i < answerOrder.length; i++) {
      const final = await page.evaluate((i) => {
        const answerBoxes = document.querySelectorAll(".dialog-text");
        let bounds = answerBoxes[i].getBoundingClientRect();
        let x = parseInt(bounds.x + (bounds.width/2));
        let y = parseInt(bounds.y + (bounds.height/2));

        return {x: x, y: y};
      }, i);

      const initial = await page.evaluate(async (ans) => {
        const options = document.querySelectorAll(".dialog-text");
        for (let i = 0; i < options.length; i++) {
          if (options[i].textContent.includes(ans)) {
            let bounds = options[i].getBoundingClientRect();
            let x = parseInt(bounds.x + (bounds.width/2));
            let y = parseInt(bounds.y + (bounds.height/2));

            return {x: x, y: y};
          }
        }
      }, answerOrder[i]);
      sleep(1000)

      await page.mouse.move(initial.x, initial.y);
      await page.mouse.down();
      await page.mouse.move(final.x, final.y);
      await page.mouse.up();
      sleep(250);
    }

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    })

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

qcmVideo = async (page) => {
  try {
    await page.waitFor(".exercice-content");

    await page.evaluate(() => {
      const options = document.querySelectorAll(".answer-text");

      for (let i = 0; i < options.length; i++) {
        if (options[i].innerHTML.includes(options[i].getAttribute("correct"))) {
          options[i].click();
        }
      }
    });

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

writingAssistant = async (page) => {
  try {
    await page.waitFor(".exercice-content");

    sleep(2000);

    const modalCoords = await page.evaluate(() => {
      const bounds = document.querySelector("#modalCloseBtn").getBoundingClientRect();
      let x = bounds.x + (bounds.width/2);
      let y = bounds.y + (bounds.height/2);
      return {x: x, y: y};
    });

    await page.mouse.click(modalCoords.x, modalCoords.y);
 
    await page.evaluate(() => {
      const btns = document.querySelectorAll(".btn-default");

      for (let i = 0; i < btns.length; i++) {
        if (btns[i].innerHTML.includes("Respuesta tipo")) {
          btns[i].click();
        }
      }
    });

    sleep(1000)

    const text = await page.evaluate(() => {
      const iframe = document.querySelector("iframe");
      return iframe.contentWindow.document.querySelectorAll("p")[1].innerText;
    })
    
    await page.mouse.click(modalCoords.x, modalCoords.y);
    await page.type("#text", text);

    await page.evaluate(() => {
      document.querySelector(".btn-next").click();
    })

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

dragNDropGeneric = async (page) => {
  try {
    await page.waitFor(".exercice-content");

    let movements = await page.evaluate(() => {
      const draggables = document.querySelectorAll(".ui-draggable-handle");
      const targets = document.querySelectorAll(".box-slot");
      let movements = [];

      draggables.forEach((e1) => targets.forEach((e2) => {
        if (e1.getAttribute("ans") == e2.getAttribute("ans")) {
          let initialBounds = e1.getBoundingClientRect();
          let initialX = parseInt(initialBounds.x + (initialBounds.width/2));
          let initialY = parseInt(initialBounds.y + (initialBounds.height/2));

          let finalBounds = e2.getBoundingClientRect();
          let finalX = parseInt(finalBounds.x + (finalBounds.width/2));
          let finalY = parseInt(finalBounds.y + (finalBounds.height/2));

          movements.push({
            initialX: initialX,
            initialY: initialY,
            finalX: finalX,
            finalY: finalY,
          });
        }
      }));

      return movements;
    });

    for (let i = 0; i < movements.length; i++) {
      await page.mouse.move(movements[i].initialX, movements[i].initialY);
      await page.mouse.down();
      await page.mouse.move(movements[i].finalX, movements[i].finalY);
      await page.mouse.up();
    }


    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

blankSentence = async (page) => {
  try {
    await page.waitFor(".exercice-content");

    const snaptargets = await page.evaluate(async () => {
      const snaptargets = document.querySelectorAll(".snaptarget");

      let elements = [];

      for (let i = 0; i < snaptargets.length; i++) {
        let tag = snaptargets[i].getAttribute("ans");
        let bounds = snaptargets[i].children[0].getBoundingClientRect();

        let finalX = parseInt(bounds.x + (bounds.width/2));
        let finalY = parseInt(bounds.y + (bounds.height/2));

        let coords = [finalX, finalY];
        elements.push({[tag]: coords});
      }

      return elements;
    });

    for (let i = 0; i < snaptargets.length; i++) {
      const draggableCoords = await page.evaluate(async (ans) => {
        const bounds = document.querySelector(`span[ans='${ans}']`).getBoundingClientRect();
        return [(bounds.x + bounds.width*0.33), (bounds.y + bounds.height/2)];
      }, Object.keys(snaptargets[i])[0]);

      let finalX = snaptargets[i][Object.keys(snaptargets[i])[0]][0];
      let finalY = snaptargets[i][Object.keys(snaptargets[i])[0]][1];
      
      await page.mouse.move(draggableCoords[0] + 5, draggableCoords[1]);
      await page.mouse.down();
      await page.mouse.move(finalX, finalY);
      await page.mouse.up();
    }

    await page.evaluate(() => {
      document.querySelector(".btn-correction").click();
      document.querySelector(".btn-last").click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }
}

ficheFonctionnelle = async (page) => {
  try {
    await page.waitFor(".btn-next");

    await page.evaluate(() => {
      document.querySelector(`a[name='nextBte']`).click();
    });

    sleep(5000);

    await page.waitFor("body");

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

sectionProgram = async (page) => {
  try {
    await page.waitFor(".btn-last");

    await page.evaluate(() => {
      document.querySelector(".btn-last").click();
    });

    await page.waitFor("body");

    sleep(10000);

    let index = await programFinder(page);

    while (index == -1) {
       await page.evaluate(async () => {
        await document.querySelector("a[ng-click='nextPage()']").click();
      });
      
      sleep(1500);
      
      index = await programFinder(page);
    }

    await page.waitFor("#header" + index.toString());

    await page.evaluate(async (index) => {
      await document.querySelector("#header" + index.toString()).children[4].children[0].click();
    }, index);

    sleep(1000);

    await page.waitFor("body");
    
    sleep(5000);

    await sectionIdentifier(page);
  } catch (err) {
    console.error(err);
  }

  return;
}

init();
