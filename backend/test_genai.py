import asyncio
from google import genai
from google.genai import types

async def my_async_tool(x: int) -> int:
    """A sample async tool.
    
    Args:
        x: An integer
    """
    return x * 2

def test_it():
    try:
        config = types.GenerateContentConfig(
            tools=[my_async_tool],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )
        print("Success! Schema created.")
    except Exception as e:
        print(f"Failed: {e}")

test_it()
