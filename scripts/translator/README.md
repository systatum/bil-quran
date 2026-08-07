# Translation module

## Run

### Dev (Local)

Probably just `./dev.sh`, or do something if `uv` is mad.

### Dev (Container)

`docker compose up --build`

### Cloud

TODO

## Compatibility note

CUDA has a bit more moving parts than the average dockerfile.
Using prebuilt wheel such as pytorch and llama-cpp-python narrows down compatible builds more.

The driver version is installed by the host (not container).
As long as driver is not very old, new cuda versions should be able to run fine.
For example [cuda 13.X only needs driver version 580+](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html) as of time of writing.
(old hardware such as GTX series is probably stuck to 580 according to <https://wiki.archlinux.org/title/NVIDIA>).

Cuda versions are backwards compatible in terms of using it as end-user.
It is not the case for applications that compiles cuda.
The hardware determines what kind of Compute Capability / Streaming Multiprocessor (SM) is supported.
The resulting binary is completely backwards compatible if using PTX.
Native binaries (CUBIN) however only supports backwards compatibility within the same major version. See
<https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#binary-compatibility>.

This missing backwards compatibility support for non-PTX code is what may be of issue for application code such as pytorch or llama-cpp-python

Compatibility matrix for the application itself:

- [llama-cpp-python](https://llama-cpp-python.readthedocs.io/en/latest/#supported-backends)  
  Compute Capability / Streaming Multiprocessor (SM) 7.5+
- [pytorch-2.12.1](https://github.com/pytorch/pytorch/blob/v2.12.1/RELEASE.md)  
  With cuda 13.2, SM 7.5, 8.0, 8.6, 9.0, 10.0, 12.0+PTX

[SM list for GPU](https://developer.nvidia.com/cuda/gpus)

Currently offered GPUs from runpod should satisfy this 7.5+ SM
