"""
Unit tests for app/auth.py
"""
from datetime import timedelta
import pytest
from jose import jwt
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)


def test_get_password_hash_not_plaintext():
    hashed = get_password_hash("mypassword")
    assert hashed != "mypassword"
    assert len(hashed) > 10


def test_verify_password_correct():
    hashed = get_password_hash("secret")
    assert verify_password("secret", hashed) is True


def test_verify_password_wrong():
    hashed = get_password_hash("secret")
    assert verify_password("wrongpass", hashed) is False


def test_create_access_token_has_sub_and_exp():
    token = create_access_token(data={"sub": "EMP001"})
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "EMP001"
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    token = create_access_token(data={"sub": "EMP001"}, expires_delta=timedelta(hours=1))
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "EMP001"


def test_expired_token_raises():
    from jose import ExpiredSignatureError
    token = create_access_token(data={"sub": "EMP001"}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(ExpiredSignatureError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
