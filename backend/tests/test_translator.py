"""
Unit tests for app/services/translator.py
The Groq client is fully mocked — no real API calls are made.
"""
import json
import pytest
from unittest.mock import MagicMock, patch

# ── HindiTranslator unit tests ────────────────────────────────────────────────

def _make_translator(api_key="fake-key"):
    """Construct a HindiTranslator with a mocked Groq client."""
    with patch("app.services.translator.Groq"):
        from app.services.translator import HindiTranslator
        t = HindiTranslator(api_key=api_key)
    return t


def _mock_completion(content: str):
    """Build a mock Groq chat completion response."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


# ── Instantiation ─────────────────────────────────────────────────────────────

def test_no_api_key_raises():
    with patch.dict("os.environ", {}, clear=True):
        # Remove GROQ_API_KEY from env so it is not picked up
        import os
        os.environ.pop("GROQ_API_KEY", None)
        with patch("app.services.translator.Groq"):
            from app.services.translator import HindiTranslator
            with pytest.raises(ValueError, match="GROQ_API_KEY"):
                HindiTranslator(api_key=None)


# ── _has_hindi ────────────────────────────────────────────────────────────────

def test_has_hindi_returns_true_for_devanagari():
    t = _make_translator()
    assert t._has_hindi("यह हिंदी है") is True


def test_has_hindi_returns_false_for_english():
    t = _make_translator()
    assert t._has_hindi("This is English") is False


def test_has_hindi_returns_false_for_empty():
    t = _make_translator()
    assert t._has_hindi("") is False


# ── translate_title ───────────────────────────────────────────────────────────

def test_translate_title_empty_returns_unchanged():
    t = _make_translator()
    assert t.translate_title("") == ""
    assert t.translate_title("  ") == "  "


def test_translate_title_calls_groq(monkeypatch):
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(
        return_value=_mock_completion("यह शीर्षक है")
    )
    result = t.translate_title("This is a title")
    assert result == "यह शीर्षक है"


def test_translate_title_returns_original_on_error(monkeypatch):
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(side_effect=Exception("API error"))
    result = t.translate_title("Hello")
    assert result == "Hello"


# ── translate_text ────────────────────────────────────────────────────────────

def test_translate_text_empty_returns_none():
    t = _make_translator()
    assert t.translate_text("") is None
    assert t.translate_text("   ") is None


def test_translate_text_returns_hindi_on_success(monkeypatch):
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(
        return_value=_mock_completion("यह अनुवाद है।")
    )
    result = t.translate_text("This is a paragraph.")
    assert result == "यह अनुवाद है।"


def test_translate_text_returns_none_if_no_hindi_after_retries(monkeypatch):
    """If the model keeps returning English, translate_text returns None."""
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(
        return_value=_mock_completion("Still English text.")  # no Devanagari
    )
    result = t.translate_text("Some English text")
    assert result is None


def test_translate_text_returns_none_on_non_rate_limit_error(monkeypatch):
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(side_effect=Exception("Server error"))
    result = t.translate_text("Some text")
    assert result is None


# ── _wait_for_rate_limit ──────────────────────────────────────────────────────

def test_wait_for_rate_limit_parses_message(monkeypatch):
    t = _make_translator()
    sleep_calls = []
    monkeypatch.setattr("app.services.translator.time.sleep", lambda s: sleep_calls.append(s))
    t._wait_for_rate_limit("Please try again in 1m30.5s")
    # 1*60 + 30.5 + 5 buffer = 95.5
    assert len(sleep_calls) == 1
    assert abs(sleep_calls[0] - 95.5) < 0.1


def test_wait_for_rate_limit_fallback(monkeypatch):
    t = _make_translator()
    sleep_calls = []
    monkeypatch.setattr("app.services.translator.time.sleep", lambda s: sleep_calls.append(s))
    t._wait_for_rate_limit("Rate limited, no time info")
    assert sleep_calls == [60]


# ── translate_quiz_data ───────────────────────────────────────────────────────

SAMPLE_QUIZ = json.dumps([
    {
        "question": "What is the correct OD?",
        "options": ["10mm", "12mm", "14mm"],
        "correct_answer": "12mm",
        "explanation": "Refer to the drawing.",
        "type": "mcq"
    }
])

TRANSLATED_QUIZ = json.dumps([
    {
        "question": "सही OD क्या है?",
        "options": ["10mm", "12mm", "14mm"],
        "correct_answer": "12mm",
        "explanation": "ड्रॉइंग देखें।",
        "type": "mcq"
    }
])


def test_translate_quiz_data_valid(monkeypatch):
    t = _make_translator()
    t.client.chat.completions.create = MagicMock(
        return_value=_mock_completion(TRANSLATED_QUIZ)
    )
    result = t.translate_quiz_data(SAMPLE_QUIZ)
    parsed = json.loads(result)
    assert len(parsed) == 1
    assert "सही" in parsed[0]["question"]


def test_translate_quiz_data_empty_returns_unchanged():
    t = _make_translator()
    assert t.translate_quiz_data("") == ""
    assert t.translate_quiz_data("   ") == "   "


def test_translate_quiz_data_invalid_json_returns_original():
    t = _make_translator()
    bad_json = "not-valid-json"
    result = t.translate_quiz_data(bad_json)
    assert result == bad_json


def test_translate_quiz_data_not_list_returns_original():
    t = _make_translator()
    obj_json = json.dumps({"key": "value"})  # dict, not list
    result = t.translate_quiz_data(obj_json)
    assert result == obj_json


def test_translate_quiz_data_llm_wrapped_in_object(monkeypatch):
    """LLM sometimes wraps the list in a JSON object — should unwrap it."""
    t = _make_translator()
    wrapped = json.dumps({"questions": json.loads(TRANSLATED_QUIZ)})
    t.client.chat.completions.create = MagicMock(
        return_value=_mock_completion(wrapped)
    )
    result = t.translate_quiz_data(SAMPLE_QUIZ)
    parsed = json.loads(result)
    assert isinstance(parsed, list)
    assert len(parsed) == 1
