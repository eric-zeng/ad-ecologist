/**
 * Insert script into DOM to check that pbjs exists.
 * @return true if pbjs library detected on page,
 * false otherwise
 */
export async function checkIfExists() {
  return new Promise<boolean>((resolve, reject) => {
    const existsResult = document.createElement('div');
    existsResult.id = 'existsResult';
    document.head.appendChild(existsResult);

    const existsScript = document.createElement('script');
    existsScript.textContent = `
      let exists = document.getElementById('existsResult');
      exists.innerText =
        !(typeof pbjs === 'undefined' || pbjs.getAllWinningBids === undefined);
    `;

    const observer = new MutationObserver((mutationList, observer) => {
      const pbjsExists = JSON.parse(existsResult.innerText) as boolean;
      observer.disconnect();
      existsScript.remove();
      existsResult.remove();

      resolve(pbjsExists);
    });

    // Observe changes to response element
    observer.observe(existsResult, {
      attributes : false,
      characterData : true,
      childList : true
    });

    document.body.appendChild(existsScript);


    setTimeout(function () {
      if (document.head.contains(existsResult)) {
        // clean up observer and elements
        observer.disconnect();
        existsResult.remove();
        existsScript.remove();
        reject(new Error('mutation not observed'));
      }
    }, 2000)
  });
}

/**
 * Generic function that can call some different pbjs functions,
 * such as getWinningBids() and getBidResponses()
 * @return JSON format of pbjs function response
 */
let variableCounter = 0;
export async function callFn(functionName : string) {
  let curCounter = variableCounter;
  variableCounter += 1;

  const bidResponseScript = document.createElement('script');
  // counter to name id of injection function
  bidResponseScript.textContent =
  ` (function() {
      let responses = pbjs.${functionName}();
      innerResponsesDiv = document.getElementById('responsesDiv'
      + ${curCounter.toString()});
      innerResponsesDiv.innerText = JSON.stringify(responses);
    })();
  `;

  const responsesDiv = document.createElement('div');
  responsesDiv.id = "responsesDiv" + curCounter.toString();
  document.head.appendChild(responsesDiv);

  let dataJSON = JSON.parse('{}');
  // now check for when responsesDiv is mutated so that we know when to
  // return the JSON data that the pbjs method returns
  return new Promise<any>(function(resolve, reject) {
    const observer = new MutationObserver(function(mutationList, observer) {
      // Parse stringified version of text content back into structured
      // JSON data
      dataJSON = JSON.parse(responsesDiv.innerText);

      // Clean up injected elements and MutationObserver
      observer.disconnect();
      bidResponseScript.remove();
      responsesDiv.remove();
      resolve(dataJSON);
    });

    // Observe changes to response element
    observer.observe(responsesDiv, {
      attributes : false,
      characterData : true,
      childList : true
    });

    // add script to DOM so that inner pbjs will be called
    document.head.appendChild(bidResponseScript);

    // make sure it eventually mutates
    setTimeout(function () {
      if (document.head.contains(responsesDiv)) {
        // clean up observer and elements
        bidResponseScript.remove();
        responsesDiv.remove();
        observer.disconnect();
        reject(new Error('mutation not observed'));
      }
    }, 2000)
  });
}