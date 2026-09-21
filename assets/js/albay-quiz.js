(function () {
  'use strict';

  var dialog = document.getElementById('albay-quiz');
  var trigger = document.getElementById('albay-quiz-start');
  if (!dialog || !trigger) return;
  var content = document.getElementById('albay-quiz-content');
  var questions = null;
  var index = 0;
  var answers = [];
  var complete = false;
  var loading = false;
  var loadFailed = false;
  var scrollY = 0;
  var bodyStyle = '';

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, action, className) {
    var node = element('button', className || 'albay-quiz-action', text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function focusHeading() {
    if (!dialog.open) return;
    var heading = content.querySelector('[tabindex="-1"]');
    if (heading) heading.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  }

  function heading(text) {
    var node = element('h3', 'albay-quiz-question', text);
    node.tabIndex = -1;
    return node;
  }

  function validate(data) {
    function text(value) {
      return typeof value === 'string' && value.trim().length > 0;
    }
    if (
      !data ||
      !text(data.title) ||
      !Number.isInteger(data.total_items) ||
      !Array.isArray(data.questions) ||
      !data.questions.length ||
      data.total_items !== data.questions.length
    )
      throw new Error('Invalid quiz metadata');
    var ids = new Set();
    var counts = { easy: 0, medium: 0, hard: 0 };
    data.questions.forEach(function (q) {
      if (
        !q ||
        !Number.isInteger(q.id) ||
        q.id < 1 ||
        ids.has(q.id) ||
        !text(q.question) ||
        !text(q.category) ||
        ['Easy', 'Medium', 'Hard'].indexOf(q.difficulty) === -1 ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every(text) ||
        new Set(q.options).size !== 4 ||
        !text(q.answer) ||
        q.options.indexOf(q.answer) === -1
      ) {
        throw new Error('Invalid quiz question');
      }
      ids.add(q.id);
      counts[q.difficulty.toLowerCase()]++;
    });
    if (
      !data.difficulty_breakdown ||
      Object.keys(counts).some(function (key) {
        return data.difficulty_breakdown[key] !== counts[key];
      })
    )
      throw new Error('Invalid quiz difficulty totals');
    return data.questions;
  }

  function correctCount() {
    return answers.filter(function (answer, i) {
      return answer === questions[i].answer;
    }).length;
  }

  function t(key, fallback) {
    if (window.TranslationEngine && typeof window.TranslationEngine.t === 'function') {
      var val = window.TranslationEngine.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  }

  function updateTrigger() {
    var key = complete
      ? 'quiz-btn-view-results'
      : questions
        ? 'quiz-btn-continue'
        : 'quiz-btn-take';
    var defaultLabel = complete ? 'View results' : questions ? 'Continue quiz' : 'Take the Quiz';
    var label = t(key, defaultLabel);
    var span = trigger.querySelector('span');
    if (span) {
      span.textContent = label;
      span.setAttribute('data-i18n', key);
    } else {
      trigger.textContent = label;
      trigger.setAttribute('data-i18n', key);
    }
  }

  function close() {
    dialog.close();
  }

  function render() {
    content.replaceChildren();
    updateTrigger();
    var correct = correctCount();
    var progress = element('div', 'albay-quiz-progress');
    var rail = element('progress');
    rail.max = questions.length;
    rail.value = answers.length;
    rail.setAttribute('aria-label', 'Questions answered');
    progress.appendChild(rail);
    progress.appendChild(
      element(
        'span',
        'albay-quiz-position',
        complete ? 'Quiz complete' : 'Question ' + (index + 1) + ' of ' + questions.length
      )
    );
    progress.appendChild(
      element(
        'span',
        'albay-quiz-count albay-quiz-count--wrong',
        '× Incorrect ' + (answers.length - correct)
      )
    );
    progress.appendChild(
      element('span', 'albay-quiz-count albay-quiz-count--correct', '✓ Correct ' + correct)
    );
    content.appendChild(progress);

    var steps = element('div', 'albay-quiz-steps');
    var maxVisible = 10;
    var startStep = Math.max(0, Math.min(index - Math.floor(maxVisible / 2), questions.length - maxVisible));
    var endStep = Math.min(questions.length, startStep + maxVisible);
    for (var i = startStep; i < endStep; i++) {
      var stepClass = 'albay-quiz-step';
      if (answers[i] !== undefined) stepClass += ' is-done';
      else if (i === index) stepClass += ' is-current';
      else stepClass += ' is-upcoming';
      steps.appendChild(element('span', stepClass));
    }
    content.appendChild(steps);

    var body = element('div', 'albay-quiz-body' + (complete ? ' albay-quiz-body--complete' : ''));
    content.appendChild(body);
    if (complete) {
      body.appendChild(heading(t('quiz-complete', 'Quiz complete')));
      body.appendChild(element('p', 'albay-quiz-score', correct + ' / ' + questions.length));
      var pct = correct / questions.length;
      var gradeLabel = pct >= 0.9 ? 'Excellent!' : pct >= 0.7 ? 'Great job!' : pct >= 0.5 ? 'Good effort!' : 'Keep learning!';
      body.appendChild(element('p', 'albay-quiz-grade', gradeLabel));
      body.appendChild(
        element(
          'p',
          'albay-quiz-meta',
          Math.round(pct * 100) +
            '% correct · ' +
            (questions.length - correct) +
            ' incorrect'
        )
      );
      body.appendChild(
        element(
          'p',
          '',
          'Thanks for exploring Albay with us. Try again to put your knowledge to the test.'
        )
      );
      var actions = element('div', 'albay-quiz-actions');
      actions.appendChild(
        button(t('quiz-btn-try-again', 'Try again'), function () {
          index = 0;
          answers = [];
          complete = false;
          render();
          focusHeading();
        })
      );
      actions.appendChild(button(t('quiz-btn-close', 'Close quiz'), close, 'albay-quiz-close'));
      body.appendChild(actions);
      return;
    }
    var question = questions[index];
    body.appendChild(
      element('p', 'albay-quiz-meta', question.category + ' · ' + question.difficulty)
    );
    var title = heading(question.question);
    title.id = 'albay-quiz-question';
    body.appendChild(title);
    var options = element('div', 'albay-quiz-options albay-quiz-options--grid');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-labelledby', title.id);
    question.options.forEach(function (option, choice) {
      var answer = button(
        '',
        function () {
          if (answers[index] !== undefined) return;
          answers[index] = option;
          answer.focus({ preventScroll: true });
          updateAnswer();
        },
        'albay-quiz-option'
      );
      answer.appendChild(
        element('span', 'albay-quiz-letter', String.fromCharCode(65 + choice) + '.')
      );
      answer.appendChild(element('span', 'albay-quiz-option-text', option));
      answer.appendChild(element('span', 'albay-quiz-option-state'));
      options.appendChild(answer);
    });
    body.appendChild(options);
    var feedback = element('p', 'albay-quiz-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    body.appendChild(feedback);
    var nextText =
      index === questions.length - 1
        ? t('quiz-see-results', 'See results')
        : t('quiz-next-question', 'Next question');
    var next = button(nextText, function () {
      if (answers[index] === undefined) return;
      if (index === questions.length - 1) complete = true;
      else index++;
      render();
      focusHeading();
    });
    body.appendChild(next);

    function updateAnswer() {
      var selected = answers[index];
      next.disabled = selected === undefined;
      if (selected === undefined) {
        feedback.className = 'albay-quiz-feedback';
        return;
      }
      options.classList.add('is-revealed');
      Array.prototype.forEach.call(options.children, function (node, choice) {
        var value = question.options[choice];
        node.setAttribute('aria-disabled', 'true');
        var state = node.querySelector('.albay-quiz-option-state');
        if (value === question.answer) {
          node.classList.add('is-correct');
          state.textContent = '✓ Correct answer';
        } else if (value === selected) {
          node.classList.add('is-wrong');
          state.textContent = '× Your answer';
        }
      });
      feedback.textContent =
        selected === question.answer
          ? 'Correct! ' + question.answer + ' is the right answer.'
          : 'Not quite. The correct answer is ' + question.answer + '.';
      feedback.className =
        'albay-quiz-feedback ' + (selected === question.answer ? 'is-correct' : 'is-wrong');
      var count = correctCount();
      rail.value = answers.length;
      progress.querySelector('.albay-quiz-count--wrong').textContent =
        '× Incorrect ' + (answers.length - count);
      progress.querySelector('.albay-quiz-count--correct').textContent = '✓ Correct ' + count;
    }
    updateAnswer();
  }

  function load() {
    if (loading) return;
    loading = true;
    loadFailed = false;
    content.replaceChildren(heading('Loading quiz…'));
    content.setAttribute('aria-busy', 'true');
    focusHeading();
    var controller = new AbortController();
    var timeout = setTimeout(function () {
      controller.abort();
    }, 15000);
    fetch('data/albay-quiz.json', { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('Quiz request failed: ' + response.status);
        return response.json();
      })
      .then(function (data) {
        questions = validate(data);
        render();
        focusHeading();
      })
      .catch(function (error) {
        loadFailed = true;
        console.error('Albay quiz could not load', { message: error.message });
        content.replaceChildren(heading('The quiz could not load'));
        content.appendChild(element('p', '', 'Please check your connection and try again.'));
        content.appendChild(button('Retry', load));
        focusHeading();
      })
      .finally(function () {
        clearTimeout(timeout);
        loading = false;
        content.removeAttribute('aria-busy');
      });
  }

  trigger.addEventListener('click', function () {
    if (dialog.open) return;
    // Volunteer cleanup is synchronous so only one owner can pin the body.
    document.dispatchEvent(new CustomEvent('albay-quiz:opening'));
    scrollY = window.scrollY;
    bodyStyle = document.body.getAttribute('style');
    document.body.style.position = 'fixed';
    document.body.style.top = -scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    if (questions) {
      render();
      focusHeading();
    } else if (!loading && !loadFailed) load();
    else focusHeading();
  });
  dialog.querySelector('.albay-quiz-close').addEventListener('click', close);
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    var rect = dialog.getBoundingClientRect();
    var isInside =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!isInside) close();
  });
  dialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', function () {
    if (bodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', bodyStyle);
    window.scrollTo(0, scrollY);
    trigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    var nodes = Array.prototype.filter.call(
      dialog.querySelectorAll('button:not([disabled])'),
      function (node) {
        return node.getClientRects().length;
      }
    );
    var current = nodes.indexOf(document.activeElement);
    event.preventDefault();
    var next =
      current === -1
        ? event.shiftKey
          ? nodes.length - 1
          : 0
        : (current + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
    nodes[next].focus();
  });

  document.addEventListener('languageChanged', function () {
    updateTrigger();
    if (dialog.open && questions) {
      render();
    }
  });
})();
