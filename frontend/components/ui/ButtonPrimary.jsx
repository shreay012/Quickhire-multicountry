"use client";

import { Button } from "@mui/material";
import Link from "next/link";

const ButtonPrimary = () => {
  return (
    <>
      <Link href="/book-your-resource" style={{ textDecoration: "none" }}>
        <Button
          variant="contained"
          className="rounded-xl px-6! py-3.5!"
          sx={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#3FA12B",
            textTransform: "none",
            fontFamily: "Open Sauce One Regular",
            minWidth: "unset",
            whiteSpace: "nowrap",
            // boxShadow: "0px 14px 34px 0px #78EB5473",

            // fontSize: "16px",
            fontSize: { xs: "11px", sm: "12px", md: "16px" },
            padding: {
              xs: "10px 14px",
              sm: "12px 18px",
              md: "14px 24px",
            },
            borderRadius: "8px",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              backgroundColor: "#26472B",
              transition: "left 0.5s ease",
              boxShadow: "0px 14px 34px 0px #78EB5473",
              zIndex: 0,
            },

            "&:hover": {
              boxShadow: "0px 14px 34px 0px #78EB5473",
            },
            "&:hover::before": {
              left: 0,
            },
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            Hire in 10 Minutes
          </span>
        </Button>
      </Link>
    </>
  );
};

export default ButtonPrimary;
