from setuptools import find_packages, setup


setup(
    name="ai-tools-test",
    version="0.1.0",
    description="A minimal Python project scaffold for experimenting with AI tooling.",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    python_requires=">=3.8",
)
