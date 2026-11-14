import os
import sys

# Make `import config`, `import services...` work when running `pytest` from backend/.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
