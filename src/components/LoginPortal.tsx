import React, { useState } from "react";
import { User, Lock, AlertCircle, Eye, EyeOff, Mail, Hash, Layers, GraduationCap, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface LoginPortalProps {
  onLoginSuccess: (session: any) => void;
}

const BATCH_OPTIONS = ["A1", "A2", "A3", "A4"];
const SPECIALIZATION_OPTIONS = ["AI & ML", "SD", "MV"];

// Srinivas University logo (embedded so this single file is self-contained)
const UNIVERSITY_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQExAVEBUVEBcSFRYYGBYVFxUVFxUXFhYVFRUYHSggGBonHRUVITEhJSkrLi4uFx8zODMtNygtLi0BCgoKDg0OGxAQGi0lICUtLS0vLS0tLS0tKy0tLS0tLS0tLS0vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAOEA4QMBEQACEQEDEQH/xAAcAAEAAgMBAQEAAAAAAAAAAAAAAQcFBggEAwL/xABFEAABAwICBgYHBAcIAwEAAAABAAIDBBEFBgcSITFBURMiYXGBoRQyQlKRscEjM2JyFUNjgpLR8CREU1STo7LCF4OiCP/EABwBAQACAwEBAQAAAAAAAAAAAAABBAIDBwYFCP/EAD0RAAIBAwIEAggEBQMDBQAAAAABAgMEEQUhBhIxQVFhEyIycYGhscEUkdHwI0JSYuEHFTOS0uIWNFRygv/aAAwDAQACEQMRAD8AqZe2NwQBAEAQBAFAChvHUElZYxuRk+kdPI71Y3O/K0n5Bap1IR6yJyff9GVP+Wm/03/yWpXlD+onL8DzywPb6zHN72kfMLbGpCXRkNnzWfxIyTdSk+hllApgEKSAgCAIAgCAIAgCAIAgCAIAoAUgIAgCjICZARPIbPvR0kkzxHGx0jydjWi5Phy7VpuLilQg6lSSSX76Bb9CyMB0TPdZ9XN0fHo49ru4uOweF14HUePKcMxtYZ83lfJo2qk+5vWF5Lw6mtqUzHO96T7R3xcvFXnEl/dP157eGF+htVJIz0cbWiwaG9wAXxXUk+rM+VH6usck4R+XRtOwta4doBUqbTymRyoxWIZXoJ/vKSInmGhp+LbFfVttev7fHo6mPgv0MXBM1HGNE1K+7qeV8B913XZ8d4816ew47uae1xHn884+iNbo+BXuYMlV1Ftki12cHx3e23M8W+K91pnEdlf+xLD8Ht83g0yhKO7NdX3k0+hGQpAUMBE8gKQEAQBAEAQBAEAQBQApAQBAFGQTZR5IGbyrlqfEJujjFmjbJIfVYPq7kF8rV9Yo6bS5qr9btH97mUY8xeuXcuU1BGGQsF7DXkO17zzJ4DsC4vqus3Go1XOq9uy7IsxgkZhfHMwoJCAIAgCkBEwQd1uHksoy5d0yGsmkZt0cU1WDLBammsTs+7efxN4d4XtNG4vuLPFO49eHj4e7GDROj3RTmM4TPSSmGeMxuHwcObTxC6pY31C8pKpSllfDK+BoaweFW1gBEAsgEAQBAEAQBAEAQBAEAQBAFHdA9WG0MlRKyCNus97tVvjxPYN6rXV1C1ozrz7BLLwdG5ewaOip2U8Y9UdZ3F7uLjzXBNV1Kpf3Eq022m9k+xbhDCMkvnZNgUAKAEAQBSAmAEBCEEploGGzPlyDEIeilG0eo8esw8weXML7GlazcafVU6b27rsa6lPJQWYsEmoZ3QSjaD1XcHt4OaV23S9To6hbRrU3713Xv6lSXqvcxi+iSgpAQBAEAQBAEAQBAEAQBAEBIULw8QWroZwHZJXvHOGL/u4fLwK5rx3qr5o2kH5y+WEbaUe5aa5kWggCAIAgCkBTjfBGTyYjiUFM3WmmZEPxOAJ7hvKuWlhc3bxQg5e4xc0jUMR0p4fGbMbLPttdrQ1vgXb16e14HvqyzOSh70/sa3WRipdMMd+rREjteAfIL6kOAJqPrVln4mt12feHS/TH1qSVvc5rvIrTU/0+uOsa0fdhmUaxs+CZ0w+ss2OcMefYf1HX5C+wrz19wzf2frSg2l37GfpUz8Z6yw3EKYsAAlju+J3G/FncVnw9rMtOu/WfqPZrt+gqRUkc+SMLSWkapBII5EGxC7fTmqkFNdysflbAEAQBAEAQBAEAQBAEAQBAfSCIvcGN2lzg0dpJsPmtdWoqcHN9FuO+DpbAsMbSU0VM3dHGGk83W6x8TdfnvUbx3d1OvLuy5BYR7188zCAIAgCkgBSo5eEG8FZ530kiJxp6Mhz27Hzb2tPFrOZ7V0Th7g9V4qvdvb+n/KZWlVz0KpraySd5klkdI4m5c46x89wXSaFtRoQUKUcJfvqaXlnxurORghM9icBRhEYChpNPmBt2V9IFZRWYXGoiHsPNyB+B28d25eY1fhW0v4/w1ySxnPn7jOM3HqeHPM1NLVuqKZ4cydrZSBvZIR12EcDceau8Pwr07RUq63i2k/FLoYvrk19fcAUAIAgCkBAEAQBAEAQBAEBnMj04kxGmYRcGdp/hu76L4vENV0tMrTXaP3QXtHRpK4HguroFiZBAEAQBSQV9pWzWaaP0OF1pZG3kI3sjPAci75L3nB2gK6qfiqy9WL282aKk8FLrrWdsIr4ChEhZAIAgCgBY79gSVn13BCAKGAoAUgKQEAQBAEAQBAEAQGx6O36uKUx/a2+LXD6r4HFEW9Jr4/p+6Ji8SR0KFwgu9ESsSQgCAICNYDadw2nw2lbIrmaRjJ7HM2O4i6qqZZyb9JK5w/LezR8LL9C6ZaQtbSFGHTHzKTeWeBXgEAUgIAofkCVDfvBCYbBKn4AhMgHcsJy5Yt+Cb/Igy2ZsHNHUdCb/AHccgJ32e0H+apafeq7p88ezxt+ZL2MSvoYAUgIAgCAIAgCAIAgPbgtb0FRDN7kzHHuDhfyuqWo26uLSpS8VgdzpsOvtG47R3HavzxUi4ycX2ZcTyiVg+pmFACAIDw45IW0s7hvEEhH8JV3T0pXME/FfUwn0OZF+i5YWxSQQkIAgJATDfQM2HLmS62vGvFGGx3t0jzqt/d4u8F57U+JLHT3iUuZ+EcN/Nkxi2WBhmiSmaAZ55JXcQyzG+dyvE3fHlzKWLeKUfPOflI3Romfg0fYU1ur6LrdrnvJ+a+LU4t1Kcs87Xub/AFMvRI+NVo2wp+6B0Z5tkf8AUkLbR4x1Gn3T97b+49CjAYlohiIJp6pzDwEgDh/E2xC+3acfVltXgseSf3kYOiY7A9FlS2pYZ3xiJjw4lp1nP1TcNAI2X7Vf1Dji1nayjQjLmksPKXfwwyI03nc+2m+hAfT1AG9roj+7ZzfIla+ArpyjVoyfV830RFWOMFXLoqNYUgIAgCAIAgCAIAgChYUsshnQmjrFfSsOicTd8Y6F/O7NgJ722K4XxNp/4PUZwS9V7r47lqk8o2ULzpuCgBAEB5sSi14JWe9C9vxaQrNpP0daEvBr6mE+hy+F+jW8spILIkID9NYSQACSTYAbSTwAA3rCcuWLlLbALXyRo0ADaitbd2xzYOA5GTmfwrmnEPGTlmhYvC6OX/a1ho3U6ed2We1oADQAANgA2ADkBwC5zUqzqS5pvL8zeopE2WGTIKAFJAUEkWU5BpelyiMuGueBtilbJ4E6p/5D4L2HBNyqOpcvaUWvjlYNFdbFFrsxXQUgIAgCAIAgCAIAgChdchlgaHsc6GqdSuNm1A6vZK3d8RceAXiONtLdxaqvBetDr7mZ0pYeC6Vx8thCQgCAfVZJ7pkNbHNWZsPNNWTwH2JnW/KTrN8iF+g9IvFd2dOr4opSWGzFr6ZBKgFy6MclCnY2tnbeZ7bxtP6th9oj3z5Lk/FnEcribtbd+our8X9TdTp9ywl4ORYwSsCQgCAIAgCA8OOUfT0s0Pvwvb46pt52X0NLr+gvaVTwkvqYTWUcykW2L9C05KUVJd9ymQswEAQBAEAQBAEAQBY9wfuGRzHBzSWua4OaRvBBuCsatNVoSpS6NYIWzyjorJuYWYhStmBHSDqyt914+h3rg+vaTPTruVPHq9vcW6csozi+L3NoWICALJAqnTPgRvHXsGywil7Pcd8x8F03gbVcp2VR9N4/oVqscblWro7zg0tlg6J8rCpkNXMy8UTtVjTufLvueYbs8V4XjPXJWtL8LReJSXre4zpQy9y51yXmecltLAWJIQBSApwAoICAI1gBZZxug+hzZm2i6CuqIrW1Z3W7ndYeTgv0Botf01hSn/avoUmsMxK+nkgKQFICAIAgCAIAgCxAR+QM7k7MkmH1Alb1mO6srPfZ2fiG8L42t6RT1O2cJe2vZYUuVnQlBWRzxMmjeHse3WafoeRXDLq2q21WVKosNF2Lyj0KqZBAFOMkM82I0UdRE+CQazJGFpHeN/eN/grVndzta8a9N7pmM45RznmPBZKGpfTvBOqeq73mH1XDw+q75pWpU7+hCvDut/JlKUeUuPRTiEMuHRxMID4S5sjeNy4uDu0EELk/GNlXo38qtT2ZdGWKEso3JeQLAQBAFJDPzI8NBc4hoAuSdgAG8krZTpSnJQisthvBoeJaVqGJ+rHFLUAEguFmtP5dbaQvbWnA95Wgp1Go58/1RodYzWVs60mIHUYTFKNvRv3kc2nc5fI1bhq7071pLMfFb/YzjUybGF53Bs7AqAuhRul+m1MTc7/EgZIe/az/AKhdm4Jquppe/aTXyRUqLEjSV68wCkBSAgCAIAgCAIAowAmASoSy8Bm7aN84Ghl6CZ39nkd39E8+2OzmvIcU8PRvqTuKSXPHw6v5ZM6c8bF4tIIuDcEXBG0EcCFxucHGTi1ui2t0SsQEJCA1LSHlP9IQB0YAniBLPxt3mMn5L1fC+vPTazhN/wAOXX99DRVhkpnAsXqMPqRKy7XMOq9h2BwvZzHhdV1Cxt9VtuWWHFr1Xtt5pmiL5WdA4BjMNbA2oiOw+s3ix3Frv62riOqaZVsK7pVV7n4ryLUJZMkvnPobAsQFINI0v1j48O1WkjpZmxuI2dWxcR3Gy9lwRbQr6g3NZ5Y5396RprPC2KNXY5ZZVwj6U8zmOD2uLHNIc1wNi0jiCsK1GnXj6KosxfiSngv/ACDmcYhTazrdNHZso5ng8dhXEeJdGlp1zsvUluvD3FmnLKNlK82jaU3prc30yED1hT9bsGudX6rrnAXP+Bk37PO/oirV9oryy9y9t308TVkW4eSiElJZi015ALNYZJCgBSAgCAIAgCAIAsMtbglT5jBaeivOfq0FQ7sgeT/tOPy+C5vxfw4mvxlstv5vebKdXsWquZeZaCgkIApIZXWk7JPTtdW07PtWi8rB+saPaFvbHmugcJcSehkrW4fqvo328itUh3K8ybmeTDp9cXdG7ZLHu1hzA94L3Ot6PS1S2ccYn/K/32MIy5ToCgrY542zRPD2PbrNI+vaFw+6talrUdGqsSXYtxeVk9CqmQUg07SxRmXDHuAuY5GSH8t7OPwK9ZwbcqhqSi/5lymmt0KIK7S/AqkJLGdiTZ9HeOeh18bibRyHoZOVnbj4G3mvPcUaar6wlGPtR3Xw3YhPDLrzDmSloWF80jb2u2MEF7+QDR8yuSabol1fySpx26ZLLnsUDj+KyV1W+dzTrSOAawbbDc1jef8AMrtenWNPTrRUuyWX7+5Vbyy0NHWQRThtVVNBlIvHGdoiB4u5v+S53xNxVKu3b2ssRXdfqjfCn3M9nLJsGIRmzRFO0HUkAtc+68D1gV8jQ+I7mxrJSk5RfXLb/LLMp087lAzxOY5zHDVc1xa4ciDYhdpp1Y1KcakOjKx81sJCkBAEAQBAEAQBQAgP0DY3Fx28QeaxlGLWH0YLu0bZxFZGKaZ39ojbsO7pWD2vzDiuQcVcPSsqnp6SzB9fJ/mb6U+zN4XijfglQOgQkKU8MhlR6UMldGXV1OzqE3mYPYcd8jR7p4rqfCXEiqxVlcPf+V+Pl0+rK1WHcwuj3OJoJeikJdTyHrfs3H22jlzX1+J+HlqNN1If8kenn5dl+ZjCeGXnE8OAc1wcHAFpG4g7QQuM1Kbg2muhbTyftYNsZPxNE17SxwDmuaWuB4gixC2UasqdRTj1TIkso56zrliTDqgssTE4l0T+Bb7p/ENy7loGsU9RtU8+uuv2Kbhys1+y+89lhIgBQvDq/APB7MPoJ6uURRMdLI7YN5sO08B3qpdXNvZ0nUqYil5foSk2XTkbIkVABLLaWoI9be2O/BnM/iXJeIeKKmoP0dL1YL5vxzhP4G+FPbc3NeQZuSwQpzuGc+aR2gYrUgC32jT/APDbruvC0m9JoZ8H9WUpr1jWl6AgKQEAQBAEAQBAEAQEqMJvIPtSVT4XtkjcWOY4Oa4cCFpr0Kdem6VRZiyN10OgMlZoZiNOH7GysAErOTveH4SuH8QaJPTa/L2fRlqnUybEvPm1hQSEBDmggggEEWIO0EHeCFtUpRkmupDWSjtIuTTQydPECaeR2z9k47dQ9nIrsnC3EKv6apVH/Ej8ynUhynv0Y529HIoqh32TjaJ5/VuPsn8B8l8/izhxXMHdWy9ZdV4/v3GdOeNmXEFylpx2LKJWOSTz11HFNGYpY2yscLFrhcLfb3NW3lz05YZjKKZoeI6JqR7i6KeSEcGkB4HcTY2Xt7Tj25pRUatNT884+kTS6PgeWl0QxBwMlY5zb7Q1gaSOVyTZWK/+oVWUOWnRSz/d/wCJjGh4m/YLgtNRx9HBEIxxO9zvzOO0rxN/qVzfVOevLP5bflg3RjgyCoYMzzYhXRU7OkleGN12sufecbNHxVi1tal1PkpLLMZSwemyr4xLBOdjnfSBJrYpUn9rb4NA+i7xwzDl0mgv7fuynJ+szXl94gIAgCAIAgCAIAgCAKAFIMrl3HJaGobURHdsc3g9p3tK+ZqmmUtRt3RqfDyYUsM6FwTFoqyBlREbtePFp4td2hcK1Gwq2VeVGqsNfMuRfMj3r55mEAQHwraSOaN0UjQ9jxquaeI/mrFtcVLerGrTeJLoyGsooLO+VH4dPq7XxPJMT+Y9x34gu3aDrlPU6CfSa2a8SlKDTN30Y536QNoah3XHVhkPtD/DcefIryHFvDXI3d2q2/mSNtOpnZlmlc6xgsII+gwFiSEAQBSQVrpsrtWnhpwdr5TIR2MFh5ldC4Atee5qVX0SWPfkr3DLBwifpYIZPfiY74tBXh7uk6VxOn4Sf1Ny9k5wzFNr1lQ6971Enk8hd70qHo7GlDwiimurMcvogKQEAQBAEAQBAEAQBAEBKjGVgjBumjHM/odT0MjvsJiGnkyTc1/0K8lxZoivrb00I/xIrw7Lt0yZ058rL0XF5RcXhlxNMLEkIAVIPBjeEw1kDqeZt2uGw8Wu4Ob2hX9O1CtY1lVpPHj1+xrnHKOfcyYJNh9QYZN4Osx42a7fZe3t+RXctL1KhqdtzLDz7S/wVJRcXktvRxnIV0fo8xAqI2793SsA9b8w4jxXM+KuHZWVR3FGP8N+Hb7G+nPxN2XimWAoAQBAFJDKH0rYn0+IvaDdsLRCO8bXn4nyXbOELH8Pp0ZNYcsv4dipUlmRb2W59XDKeT3aJjv4Y7rlmp029SnBf1fcsJ+qc5yyFznOO9zi495N13qFNRSiiofhZgkBSCFACkBAEAQBAEAQBAEAQBQ1lYDOg9HOLmrw+Nzjd8f2L+9o2HxFlwzinT1ZahOK6PdFmk9jZl5xrBtCgkICCsvMg1zPOW24hSlgAErOvE7jrcWnsK9Dw5rMtNuk2/Uez/U11I5RQ+H1stJO2Vl2SRSXtyINi09m8LtFzb0b22dOW8Zr69GVc4Z0dgeKMq6eOpZ6sjQbe672mnuN1wPUrKdlczoT7P5di5B5R7lQMwgCAx+P4m2kppal25jCR2u3NHfchfR0uzd5dQopdWvyMJywjmuaVz3l7jdznFzjzcdp8yv0JRpxpQjCPSKS+RTL3o59TL4f7uGX/wBtcSr0+fXHH+8s/wApQgXcO6KyIUIBSCLLDlZBKzJCAKG8bAIAgyETyApAQBAEAUMFv6EHnoKlvDpWHsuW7fkFy3/UCCVei/7PuzbQZZRXOiyghIQBSBdStiGUnpewVsFYJ2CzahhcRykbYO+Nwfiuw8Eai7mydCT3p/TsVKkcSyZzQpipLZqQn1SJmDlfY8fGx8V8Xj2xSdO6iuuz+C2MqMt8Fnrm7WC0SoAU47kZKo0y4/dzKFh9W0svf7DD8/guncC6Xyxle1F5R8ytVll4Ku+f9bl0bplvoacl7YjAYcumMghzcOa0g7wS0XC41a1FccQqa6OT+SLPSBRC7P4FcID9NaSQACSTYAbSSdwARvCyyMm4f+McW/y4+IVD8fR8THJpq+gZhRtncHpw6ifUSthZbWe7VbrENBdwFzuVa4rxoUnVn0QPzWUskMjopGOje02LXCxBWdvc068VOk8pg+K3dRlEIApAQBQCQpiGS1pJsASTuA49gWLajmT2xuR1OgtHmAmhomsf95IelkHIuAs09wsuHcUar/uF85x9mOyLVOOEbKvNvxNqCgkIAgCkFeaa6bWoopOLKi3g5p+oC95wFXcbupT8Y/dFesjTtEE2ribRwdDI3v3EfJes40o8+mSl/S8mqn7Rei4vkuBQGY7MOLsoqaSpfuY3YPeefVaO8r6el6fO+uYUYd+vkjCcsI5vr6x88r5pDd73F7j2n6cPBd9tbenbUY0YbJLH+Snkt7RXlmFtIyqlha+SR5ewuaCWsGxuryvvXLuL9ZrTvHb0ZYjFLw6linTWMme0jShuF1NzbWjDR2kuGwL4nC9KU9TpNLo39DKrjlwc9ldzk8sqkpjPQnJZ2hTKPpE/p8rbxQOtEDufLz7Q359y+Rqdy4r0Uevc1N5ZfS+CQcbL2xuCxfgD9MeWm4NiDcHkRtB+KxnBTi4yWU0C8MBdRY7RtNRG180YDJLdWRruD2uG2x3rkmo/juH7t+hk/Rt5Xhvv4djdBKSNXx3RPM0l1LKJm79R/VeOwHc7yX39O46oTio3kWpeSz9WiJUmuhpGIZerKfZLTSstxLSR/ELheut9Ws6sU41Y/FrP1NeGjF6w5q8qtOXSSfxIJWYI1hzWEqkI9WvzBmcFyxWVjtWGBzhxeRqsHe4/RfLvtasrNZqVE/8A6tN/UYb6Fs5P0dQ0ThPM4VEw9XZ9nGebQd57Suaa9xdWvs0qO0Pm/etyxTp46m7rxmTcSoCCgkIAgCkGhaZ5QMPY3i6paB4Akr2/AkG7+b8IfdFeu9jR9EcGtijD7kUj/IAfNey4zmo6ZKPizXSWZF6BcXZbJUxjzPCIyUfpPzX6ZP6PEfsIXEA8JJNxf3DcF2ThLQ/wND01VevP5IqVJZZpULWlwDjqtLgHHk2+0jwXrajag+Rb9NzHG5bFdpSpaeJsNHA6XUYGNc/qNAaLDq7yuZ0eCLivWlUvJpZbfqvP2NvpPArrMGY6qufrzyl1vVYOqxvc0fMr3em6PaWEUqMd13Nbk2YlfTW/UgyOXcGlrqmOlivrSOtfgxo2ueewC603FVUabkzFnVGC4ZFRU8dPENVkbA0dvNx7Sbk968jXr55qk35mB+/T2rz3/qK38/yN3oGchLq5AQBAZfLOPy0FQ2eM39l7L7Ht4tK+Xq2k0dSt3Rqdez8H+TCk4s6BwHGYa2Bs8LtYEbRxY7i1w4FcN1LTa9hWdKtH3PfD9xbhJSRkL/BUoy5JZg8GeEeSpwqmlFn08T779aNhv5K5T1S9p+xWkvdJmLgjxDKWG/5GD/Tat/8Av2pf/In/ANb/AFI9HHwPVS4HSRfd0sLO0RsH0WqesX8/arzf/wCmTyo9wFtioTqSn7TbJ2JWKJCxJCAIAgCAFSgVJptxIOkgpQdrGmV3YXbG+QPxXUuALPlp1LlrrsvhuVKzPtoRoDeoqCODYW/8neVlp4/usRpW6e6bk/c1sTQXctWy5ovMs5wVvpQzqIWuoad32jhqzPH6tp3sB948eS6Dwnw1KrNXdwvVXRPv+aK9SfgU8upprGEsJGhEp1JITAJClIkKEu7MWzoHQxlH0Sm9Llb9tUNBF98cO9rdu4n1j4cl53U7n0tTlXRGpm74nP7A8f5LwPEeo8q/DU3u+v6FihTy8mOXity7g5XX6XKAQBASoyDL5ZzDPQTdLEbg7HsPqyN5O7eR4L5WraTb6jRcKq37PuvjjJMXyvJfWWsxU9fF0kTto9dh9Zh5Ecu1cW1jRa+mVnCruu0u0vd3LUKikjLL5DWDYSEICgBBgISFACAIApQCYIPPXVccMb5ZHarGNLnHsVi2talxWjRprLk8IiUsI5yzDiTq2rknsSZZOq3jb1WNHgAu96dax06yjSltyxy359ylN5ZfGScF9BoooCOvbXk/O7aR4bB4LjPEN/8Ajr6dVdFsvgWaSxHc17SFn1tIHUtM4PnOx7xtEP8AN/ZwX3uGeF53U1cXCxBdvEwqVPApeR5cSSSSTck7SSd5J5rrMIRhHkgsRXQ0rzPyssEkKEiApYJCErc3bRVlP9IVgc9t4ICJJOTnX6kfja57B2r5+oXPoqfKurNcn2OjZ5Qxt+QsAvH313G1oupL9siEeZ4MK83NyuXVq0q1R1JdWfRjHlWCLLVlmRysv0uUAgCALEBAezCsUmpZRNDIY3jiOPY4cQq13Z0Lul6KtHK+f5kLKZcGUdJMFSBFUltNNsGtujkPYT6p7CuVa5wdWtc1bb1oeHh8W9zfCr4m+A3FxtB3EbQe48V4qUWniRvTTJWJOAoJCAIAgCAKUD5zStY0ve4Ma0Xc4mwAHElbaVGVWShTWWzGUkkUrpFzt6cfRoLiBrrk7jK4bj2NHBde4Z4Z/AL01b/ka2Xh82irOpzbHr0YZcbf9JVJbHDFfoy+wa542F+3gNveVV4s1aTX+32rzOXtL/L2/Jk0492fbOmkx0mtBREsZta6Y7HvH7P3R271r0Hg1U0q937X9Ph+TaZM6nZFaF19u++0953le/jFJJRWEjSQsiQpAQBAfehpXzSMhjaXve4MY0cXE2C1zkopyl2IbwdS5Ly5HhtGymbYkDWkd78h9Y/QdgXk69Z1ZuTNb3PriE+s63AfPmub69qH4iv6OPsx2977lyhTwsnmC+AWGSgOVl+lygEAQBQAmAESWNwybp2wRg2PLedq2hIayTpI+MT7ub+6d7fBfB1Phyz1BPMcS8d/1SMlNosrAtKFFMAJw6kf29aM9zhu8Que6hwVeUZfwXz+/C+7N8avibpSVkUw1o5WSA8WuBXk6tlcUnicGvgzNVEz7kKq011M08i6EhQAd19w57lsjSnL2U38CG0jUcx6QqGju1rvSZR7Ee0A/ifuC9RpfCd1eYnP1YeO2fLZ4NUqqRU+Z86Vlfdr3dHFe4iZsb+8d7j3rpej8O2mnJSisz/q3Xyy0V5ScjD4c+Frw6ZjpGj9W06uufdc7g3nZfWuo1JU3Gm+Vvv1x8DHB78wZlqK2zXkMiZsjhZ1Y4wNwDeJ7SqenaPb2a58Zm+svH4dDLLMNdfV6vJGCExvkMKQFICgE2RsFzaDco2BxOVu0gspweDdzpPHcOy/NfB1S5Un6KPxNbZa9fPqt1RvPkF4rXdQ/D0fRx9qXyRsow5nkxS543kvJYCAIScrL9LlAIAgCAIAgCAlQBdRkH7hmew6zXuYebSWn4hYVaUKixUWfeQtjOUudsTiGq2skt+LVd5uBXx6vDml1XmVFZ9z/UyU2j2xaSMVH94Du+Nh+iqvhPS30pL8v8k80j8T6RMVf/etX8rGD6LKHCmlLrST/fvHNIxGI5grKj72plk7C4gfAWC+nbaTZW3/AA0or3ZIbb6sxoX0OmxGECU6ghM5BKkEJgBSAgCAKM9gbDkbLT8SrGU4uGDrzOHsxg7dvM7h3qtd3Ko02+5jJnUMMUcETWMaGMYwNaBuDQLABePuLiNODq1H03Zgk28GJmkLnFx/oLlt5dzuqzqS/aPoU4qKwfhUzYEAQHK6/TBQCAIAgCAIAoBCEMICQsjILEglGAVjLozJEKf5CGFFPoQQEiApACRDCkEqQEAQBYsFxf8A5531n/q/7r4er+1E1y6luYl92V4viH/2b+Bsoe2YkblzruXn1CgkIAgP/9k=";

export default function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"student" | "lecturer" | "admin">("student");

  // Shared login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotToken, setForgotToken] = useState<string | null>(null);
  const [forgotRole, setForgotRole] = useState<string | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Sign-up only fields (students)
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRegNo, setSignupRegNo] = useState("");
  const [signupBatch, setSignupBatch] = useState(BATCH_OPTIONS[0]);
  const [signupSpecialization, setSignupSpecialization] = useState(SPECIALIZATION_OPTIONS[0]);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const switchRole = (r: "student" | "lecturer" | "admin") => {
    setRole(r);
    setError(null);
    // Only students can self sign-up; force login mode for staff/admin
    if (r !== "student") {
      setMode("login");
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError(null);
    setSignupSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all security fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      // Safely parse JSON — Vercel may return an empty body for unmatched routes
      // (e.g. /api/auth/*), which previously caused
      // "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned a non-JSON response (HTTP ${response.status}). Please try again.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `Authentication failed (HTTP ${response.status}).`);
      }

      if (!data || !data.token) {
        throw new Error("Server did not return a valid session token.");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      // Suppress the noisy fetch-level JSON parse message into a friendly string
      const raw = err?.message || "";
      const friendly = raw.includes("Unexpected end of JSON input")
        ? "The login service is unreachable. Please try again in a moment."
        : raw || "Something went wrong. Please check your credentials.";
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName || !signupEmail || !signupRegNo || !signupPassword || !signupConfirmPassword) {
      setError("Please fill in all sign-up fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(signupEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          registrationNumber: signupRegNo,
          batch: signupBatch,
          specialization: signupSpecialization,
        }),
      });

      // Safely parse JSON — server should always return JSON now.
      let data: any = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Server returned a non-JSON response (HTTP ${response.status}). The deployment may be missing environment variables.`
          );
        }
      }

      if (!response.ok || !data) {
        throw new Error(
          data?.error ||
            `Signup failed (HTTP ${response.status}). Please contact the administrator.`
        );
      }

      setSignupSuccess(true);
      // Auto-login the newly created student straight into the dashboard
      setTimeout(() => {
        onLoginSuccess(data);
      }, 900);
    } catch (err: any) {
      const raw = err?.message || "";
      const friendly = raw.includes("Unexpected end of JSON input")
        ? "The signup service is unreachable. Please try again in a moment."
        : raw || "Something went wrong while creating your account.";
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const triggerForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address below first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to request reset.");
      }
      setForgotSent(true);
      // Email isn't configured in this deployment, so the API returns the
      // token directly. Show it so the user can paste it into the reset form.
      if (data?.token) {
        setForgotToken(data.token);
        setForgotRole(data.role || null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError("Token and new password are required.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setResettingPassword(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
          role: forgotRole,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reset password.");
      }
      setShowResetForm(false);
      setForgotSent(false);
      setForgotToken(null);
      setResetToken("");
      setNewPassword("");
      setError(null);
      // Show a temporary success state — the user can now log in.
      alert("Password reset successfully! You can now log in with your new password.");
    } catch (err: any) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#111827] rounded-3xl shadow-2xl shadow-black/60 border border-white/5 p-8 relative overflow-hidden"
      >
        {/* Decorative header element */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-900" />

        {/* Logo and Name block */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/25 mb-4 bg-[#2A2470] flex items-center justify-center">
            <img
              src={UNIVERSITY_LOGO}
              alt="Srinivas University Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
            Srinivas University
          </h1>
          <p className="text-xs font-bold text-indigo-400 tracking-wider uppercase mt-1">
            Attendance ERP Portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-950 p-1.5 rounded-xl grid grid-cols-3 gap-1 mb-4 border border-white/[0.03]">
          {(["student", "lecturer", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => switchRole(r)}
              className={`py-2 text-xs font-bold rounded-lg capitalize transition-all duration-250 cursor-pointer ${
                role === r
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Login / Sign Up Mode Switch a students only, since staff & admin accounts are provisioned by Admin */}
        {role === "student" && (
          <div className="flex items-center justify-center gap-6 mb-6 border-b border-white/[0.05]">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 ${
                mode === "login"
                  ? "text-indigo-400 border-indigo-500"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 ${
                mode === "signup"
                  ? "text-indigo-400 border-indigo-500"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex gap-3 text-rose-400 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Forgot password success Toast */}
        {forgotSent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex gap-3 text-emerald-400 text-xs leading-relaxed"
          >
            <User className="w-4.5 h-4.5 shrink-0" />
            <div className="space-y-2">
              <span>A reset token has been generated for your account.</span>
              {forgotToken && (
                <>
                  <p className="text-[10px] text-slate-400">
                    Email delivery is not configured on this deployment. Use the token below to reset your password:
                  </p>
                  <code className="block font-mono text-[10px] bg-slate-900 border border-white/10 px-2 py-1 rounded break-all text-amber-300">
                    {forgotToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setResetToken(forgotToken);
                      setShowResetForm(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  >
                    Click here to reset password →
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Reset Password form */}
        {showResetForm && (
          <motion.form
            onSubmit={handleResetPassword}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mb-6 p-4 bg-slate-950/60 rounded-xl border border-white/[0.05]"
          >
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Reset Password</h3>
            <input
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste reset token here"
              className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full p-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={resettingPassword}
                className="flex-1 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition"
              >
                {resettingPassword ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => setShowResetForm(false)}
                className="p-2.5 bg-slate-900 hover:bg-white/5 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}

        {/* Sign-up success Toast */}
        {signupSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex gap-3 text-emerald-400 text-xs leading-relaxed"
          >
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
            <span>Account created successfully! Signing you in...</span>
          </motion.div>
        )}

        {/* ============== LOGIN FORM ============== */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                {role === "student" ? "Reg Number or Email" : "Staff Email"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "student" ? "e.g. 03SU25ML001" : "e.g. lecturer@college.edu"}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase">
                  Secure Password
                </label>
                <button
                  type="button"
                  onClick={triggerForgotPassword}
                  className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-bold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Quick Guidance Info Box */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-white/[0.03] flex gap-2.5 text-[11px] text-slate-400 leading-relaxed">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <div>
                <p className="font-bold text-slate-200">Authorized access only</p>
                <p>Student? Use your registration number or email. Staff & admin accounts are provisioned by the administrator. Forgot your password? Use the link above.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? "AUTHORIZING SECURITY..." : `ENTER PORTAL AS ${role.toUpperCase()}`}
            </button>

            {role === "student" && (
              <p className="text-center text-xs text-slate-500">
                New student?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
          </form>
        )}

        {/* ============== SIGN UP FORM (Students) ============== */}
        {mode === "signup" && role === "student" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Rohan Dutta"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. you@gmail.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Registration Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Hash className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={signupRegNo}
                  onChange={(e) => setSignupRegNo(e.target.value)}
                  placeholder="e.g. 03SU25ML045"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                  Batch
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500">
                    <Layers className="w-4.5 h-4.5" />
                  </span>
                  <select
                    value={signupBatch}
                    onChange={(e) => setSignupBatch(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {BATCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                  Specialization
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500">
                    <GraduationCap className="w-4.5 h-4.5" />
                  </span>
                  <select
                    value={signupSpecialization}
                    onChange={(e) => setSignupSpecialization(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {SPECIALIZATION_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showSignupPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-500">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-white/5 bg-[#0B1120] text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE STUDENT ACCOUNT"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
              >
                Log in instead
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
