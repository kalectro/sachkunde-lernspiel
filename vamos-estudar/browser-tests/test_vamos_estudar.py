"""
Browser-use tests for Vamos Estudar.

Prerequisites:
  1. HTTP server running: python3 -m http.server 8000 (from repo root)
  2. .env file with OPENROUTER_API_KEY

Run:
  source .venv/bin/activate
  python test_vamos_estudar.py
"""

import asyncio
import os
import re
from dotenv import load_dotenv
from browser_use import Agent, BrowserSession
from browser_use.llm import ChatOpenAI

load_dotenv()

BASE_URL = "http://localhost:8000/vamos-estudar/"

llm = ChatOpenAI(
    model=os.getenv("BROWSER_USE_MODEL", "openai/gpt-4o-mini"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    timeout=60,
)


async def navigate_and_wait(session: BrowserSession):
    """Navigate to the app and poll until the loading screen is gone (max 10s)."""
    import asyncio
    await session.navigate_to(BASE_URL)
    pages = await session.get_pages()
    if not pages:
        await asyncio.sleep(4)
        return
    page = pages[0]
    for _ in range(20):
        try:
            visible = await page.evaluate(
                "() => { "
                "  const p = document.getElementById('screen-profile'); "
                "  const h = document.getElementById('screen-home'); "
                "  return (p && p.style.display !== 'none') || (h && h.style.display !== 'none'); "
                "}"
            )
            if visible:
                return
        except Exception:
            pass
        await asyncio.sleep(0.5)
    # fallback
    await asyncio.sleep(2)


async def run_task(task: str, session: BrowserSession) -> str:
    agent = Agent(task=task, llm=llm, browser_session=session, max_steps=20)
    result = await agent.run()
    return result.final_result() or ""


async def test_profile_creation():
    """Test: Create a new profile and verify it appears on the home screen."""
    print("\n[1/4] Profile creation...")
    session = BrowserSession()
    try:
        await session.start()
        await navigate_and_wait(session)
        result = await run_task(
            "The browser is already on the Vamos Estudar app showing the profile creation screen. "
            "You see a text input (id='new-name') and a '➕ Criar perfil' button. "
            "Type 'TesteBot' into the text input and click the '➕ Criar perfil' button. "
            "After clicking, the home screen should appear showing 4 subject cards: Português, Matemática, Estudo do Meio, Inglês. "
            "Report exactly: 'SUCCESS: home screen visible with subject cards' or 'FAIL: <reason>'.",
            session,
        )
    finally:
        await session.stop()
    passed = bool(re.search(r'\bSUCCESS\b', result, re.IGNORECASE))
    print(f"  {'PASS' if passed else 'FAIL'} — {result[:120]}")
    return passed


async def test_archived_quiz_playable():
    """Test: The archived 2. Período exam is visible and starts."""
    print("\n[2/4] Archived quiz visible...")
    session = BrowserSession()
    try:
        await session.start()
        await navigate_and_wait(session)
        result = await run_task(
            "The browser is on the Vamos Estudar app profile screen. "
            "Click 'TesteBot' in the profile list, or if not present, type 'TesteBot' and click '➕ Criar perfil'. "
            "On the home screen, click on 'Português'. "
            "Look for a section called 'Provas passadas' containing '2.º Período 2025/26'. "
            "Click to start that archived exam. "
            "Stop as soon as you see a question on screen — do NOT try to answer it. "
            "Report exactly: 'SUCCESS: archived quiz question visible' or 'FAIL: <reason>'.",
            session,
        )
    finally:
        await session.stop()
    passed = bool(re.search(r'\bSUCCESS\b', result, re.IGNORECASE))
    print(f"  {'PASS' if passed else 'FAIL'} — {result[:120]}")
    return passed


async def test_active_exam_stars_shown():
    """Test: Active exam level screen shows star display."""
    print("\n[3/4] Active exam level screen...")
    session = BrowserSession()
    try:
        await session.start()
        await navigate_and_wait(session)
        result = await run_task(
            "The browser is on the Vamos Estudar app profile screen. "
            "Click 'TesteBot' in the profile list, or if not present, type 'TesteBot' and click '➕ Criar perfil'. "
            "On the home screen, click on 'Matemática'. "
            "You will see a level list screen. Check if star icons (⭐) or crown icons (👑) are visible next to the level names. "
            "Do NOT start any quiz — just observe the level screen. "
            "Report exactly: 'SUCCESS: level screen visible with star/crown display' or 'FAIL: <reason>'.",
            session,
        )
    finally:
        await session.stop()
    passed = bool(re.search(r'\bSUCCESS\b', result, re.IGNORECASE))
    print(f"  {'PASS' if passed else 'FAIL'} — {result[:120]}")
    return passed


async def test_achievements_screen():
    """Test: Achievements screen is accessible."""
    print("\n[4/4] Achievements screen...")
    session = BrowserSession()
    try:
        await session.start()
        await navigate_and_wait(session)
        result = await run_task(
            "The browser is on the Vamos Estudar app profile screen. "
            "Click 'TesteBot' in the profile list, or if not present, type 'TesteBot' and click '➕ Criar perfil'. "
            "On the home screen, find and click the 'Conquistas' button or trophy icon (🏆). "
            "The achievements screen should show achievement cards. "
            "Stop as soon as the achievements screen is visible. "
            "Report exactly: 'SUCCESS: achievements screen visible' or 'FAIL: <reason>'.",
            session,
        )
    finally:
        await session.stop()
    passed = bool(re.search(r'\bSUCCESS\b', result, re.IGNORECASE))
    print(f"  {'PASS' if passed else 'FAIL'} — {result[:120]}")
    return passed


async def main():
    print("=" * 60)
    print("Vamos Estudar — Browser Tests")
    print(f"Target: {BASE_URL}")
    print("=" * 60)
    print()

    results = []
    for test_fn in [
        test_profile_creation,
        test_archived_quiz_playable,
        test_active_exam_stars_shown,
        test_achievements_screen,
    ]:
        try:
            passed = await test_fn()
            results.append(passed)
        except Exception as e:
            print(f"  ERROR — {e}")
            results.append(False)

    passed_count = sum(results)
    total = len(results)
    print()
    print("=" * 60)
    print(f"Results: {passed_count}/{total} passed")
    if passed_count < total:
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
