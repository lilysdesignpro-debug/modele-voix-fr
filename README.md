# Modèle de reconnaissance vocale (français)

Modèle Whisper `small` au format ggml (whisper.cpp), découpé en morceaux de 90 Mo.
Source : OpenAI Whisper, licence MIT. Converti par le projet whisper.cpp (licence MIT).

Recomposer :

    cat ggml-small.bin.part* > ggml-small.bin
    sha256sum -c <(echo "$(cat ggml-small.bin.sha256)  ggml-small.bin")
